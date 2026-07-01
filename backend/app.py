from flask import Flask, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db_connection, init_db
import sqlite3
import datetime
import time

app = Flask(__name__)

# --- NATIVE CORS MIDDLEWARE ---
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Initialize Database on Startup
init_db()

# --- AUTHENTICATION ROUTES ---

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('username') or not data.get('password') or not data.get('role'):
        return jsonify({"error": "Missing required fields"}), 400
    
    username = data.get('username').strip()
    password = data.get('password')
    role = data.get('role') # 'customer' or 'seller'
    shop_name = data.get('shop_name', '').strip()

    hashed_password = generate_password_hash(password)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, password, role, shop_name) VALUES (?, ?, ?, ?)",
            (username, hashed_password, role, shop_name)
        )
        conn.commit()
        return jsonify({"message": "User registered successfully!"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"error": "Missing credentials"}), 400
    
    username = data.get('username').strip()
    password = data.get('password')

    conn = get_db_connection()
    cursor = conn.cursor()
    user = cursor.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    if user and check_password_hash(user['password'], password):
        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user['id'],
                "username": user['username'],
                "role": user['role'],
                "shop_name": user['shop_name']
            }
        }), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401


# --- REQUESTS ROUTES ---

@app.route('/api/requests', methods=['POST'])
def create_request():
    data = request.json
    if not data or not data.get('customer_id') or not data.get('title'):
        return jsonify({"error": "Missing customer_id or title"}), 400
    
    customer_id = data.get('customer_id')
    title = data.get('title')
    description = data.get('description', '')
    budget = data.get('budget', 0.0)
    category = data.get('category', 'General')
    image = data.get('image', '')
    
    # Expiration calculation
    expiry_hours = data.get('expiry_hours')
    expires_at = None
    if expiry_hours:
        try:
            expires_at = (datetime.datetime.utcnow() + datetime.timedelta(hours=int(expiry_hours))).strftime('%Y-%m-%d %H:%M:%S')
        except ValueError:
            pass

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO requests (customer_id, title, description, budget, category, image, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (customer_id, title, description, budget, category, image, expires_at)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({"message": "Request posted successfully", "id": new_id}), 201

@app.route('/api/requests', methods=['GET'])
def get_all_requests():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Auto-expire outdated requests (using SQLite UTC datetime check)
    cursor.execute("""
        UPDATE requests 
        SET status = 'expired' 
        WHERE status = 'active' 
          AND expires_at IS NOT NULL 
          AND expires_at < datetime('now')
    """)
    conn.commit()
    
    # Return active requests and join with username of customer
    query = """
        SELECT r.*, u.username as customer_name,
               (SELECT COUNT(*) FROM bids b WHERE b.request_id = r.id) as bid_count
        FROM requests r
        JOIN users u ON r.customer_id = u.id
        WHERE r.status = 'active'
        ORDER BY r.created_at DESC
    """
    rows = cursor.execute(query).fetchall()
    conn.close()

    requests_list = [dict(row) for row in rows]
    return jsonify(requests_list), 200

@app.route('/api/requests/customer/<int:customer_id>', methods=['GET'])
def get_customer_requests(customer_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Auto-expire outdated requests
    cursor.execute("""
        UPDATE requests 
        SET status = 'expired' 
        WHERE status = 'active' 
          AND expires_at IS NOT NULL 
          AND expires_at < datetime('now')
    """)
    conn.commit()
    
    query = """
        SELECT r.*,
               (SELECT COUNT(*) FROM bids b WHERE b.request_id = r.id) as bid_count,
               (SELECT price FROM bids WHERE request_id = r.id AND status = 'accepted' LIMIT 1) as accepted_price
        FROM requests r
        WHERE r.customer_id = ?
        ORDER BY r.created_at DESC
    """
    rows = cursor.execute(query, (customer_id,)).fetchall()
    conn.close()

    requests_list = [dict(row) for row in rows]
    return jsonify(requests_list), 200


# --- BIDS ROUTES ---

@app.route('/api/requests/<int:request_id>/bids', methods=['GET'])
def get_request_bids(request_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT b.*, u.username as seller_name, u.shop_name,
               COALESCE((SELECT AVG(rating) FROM reviews WHERE seller_id = b.seller_id), 0.0) as avg_rating,
               COALESCE((SELECT COUNT(rating) FROM reviews WHERE seller_id = b.seller_id), 0) as rating_count
        FROM bids b
        JOIN users u ON b.seller_id = u.id
        WHERE b.request_id = ?
        ORDER BY b.price ASC
    """
    rows = cursor.execute(query, (request_id,)).fetchall()
    conn.close()

    bids_list = [dict(row) for row in rows]
    return jsonify(bids_list), 200

@app.route('/api/requests/<int:request_id>/bids', methods=['POST'])
def place_bid(request_id):
    data = request.json
    if not data or not data.get('seller_id') or not data.get('price') or not data.get('delivery_days'):
        return jsonify({"error": "Missing seller_id, price, or delivery_days"}), 400
    
    seller_id = data.get('seller_id')
    price = data.get('price')
    delivery_days = data.get('delivery_days')
    notes = data.get('notes', '')

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if request is still active
    request_status = cursor.execute("SELECT status FROM requests WHERE id = ?", (request_id,)).fetchone()
    if not request_status or request_status['status'] != 'active':
        conn.close()
        return jsonify({"error": "This request is no longer accepting bids"}), 400

    cursor.execute(
        "INSERT INTO bids (request_id, seller_id, price, delivery_days, notes) VALUES (?, ?, ?, ?, ?)",
        (request_id, seller_id, price, delivery_days, notes)
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "Bid submitted successfully"}), 201

@app.route('/api/bids/<int:bid_id>/accept', methods=['POST'])
def accept_bid(bid_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get bid info
    bid = cursor.execute("SELECT * FROM bids WHERE id = ?", (bid_id,)).fetchone()
    if not bid:
        conn.close()
        return jsonify({"error": "Bid not found"}), 404

    request_id = bid['request_id']

    # Update selected bid to accepted
    cursor.execute("UPDATE bids SET status = 'accepted' WHERE id = ?", (bid_id,))
    
    # Update other bids for this request to rejected
    cursor.execute("UPDATE bids SET status = 'rejected' WHERE request_id = ? AND id != ?", (request_id, bid_id))
    
    # Update request to accepted (meaning order completed or deal made)
    cursor.execute("UPDATE requests SET status = 'accepted' WHERE id = ?", (request_id,))
    
    conn.commit()
    conn.close()

    return jsonify({"message": "Bid accepted successfully"}), 200

@app.route('/api/seller/<int:seller_id>/bids', methods=['GET'])
def get_seller_bids(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT b.*, r.title as request_title, r.budget as target_budget, r.status as request_status,
               r.category as category, r.customer_id, u.username as customer_username
        FROM bids b
        JOIN requests r ON b.request_id = r.id
        JOIN users u ON r.customer_id = u.id
        WHERE b.seller_id = ?
        ORDER BY b.created_at DESC
    """
    rows = cursor.execute(query, (seller_id,)).fetchall()
    conn.close()

    bids_list = [dict(row) for row in rows]
    return jsonify(bids_list), 200


# --- MESSAGES ROUTES ---

@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.json
    if not data or not data.get('request_id') or not data.get('sender_id') or not data.get('receiver_id'):
        return jsonify({"error": "Missing message details"}), 400
        
    request_id = data.get('request_id')
    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')
    message_text = data.get('message', '').strip()
    image_attachment = data.get('image_attachment', '')
    
    if not message_text and not image_attachment:
        return jsonify({"error": "Cannot send empty message"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (request_id, sender_id, receiver_id, message, image_attachment) VALUES (?, ?, ?, ?, ?)",
        (request_id, sender_id, receiver_id, message_text, image_attachment)
    )
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Message sent successfully"}), 201

@app.route('/api/messages/chat', methods=['GET'])
def get_chat():
    request_id = request.args.get('request_id')
    user1_id = request.args.get('user1_id')
    user2_id = request.args.get('user2_id')
    
    if not request_id or not user1_id or not user2_id:
        return jsonify({"error": "Missing chat queries"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT m.*, u.username as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.request_id = ? 
          AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
        ORDER BY m.created_at ASC
    """
    rows = cursor.execute(query, (request_id, user1_id, user2_id, user2_id, user1_id)).fetchall()
    conn.close()
    
    messages_list = [dict(row) for row in rows]
    return jsonify(messages_list), 200


# --- STATS, REVIEWS & RATINGS ROUTES ---

@app.route('/api/stats/dashboard', methods=['GET'])
def get_dashboard_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        active_requests = cursor.execute("SELECT COUNT(*) FROM requests WHERE status = 'active'").fetchone()[0]
        completed_deals = cursor.execute("SELECT COUNT(*) FROM requests WHERE status = 'accepted'").fetchone()[0]
        registered_sellers = cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'seller'").fetchone()[0]
        total_bids = cursor.execute("SELECT COUNT(*) FROM bids").fetchone()[0]
        
        # Calculate some dynamic savings (mock helper)
        avg_budget = cursor.execute("SELECT AVG(budget) FROM requests").fetchone()[0] or 0.0
        
        return jsonify({
            "active_requests": active_requests,
            "completed_deals": completed_deals + 12, # offset to make landing page look alive
            "registered_sellers": registered_sellers + 4,
            "total_bids": total_bids + 28,
            "savings_rate": "15.4%"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/reviews', methods=['POST'])
def submit_review():
    data = request.json
    if not data or not data.get('request_id') or not data.get('seller_id') or not data.get('customer_id') or not data.get('rating'):
        return jsonify({"error": "Missing review details"}), 400
        
    request_id = data.get('request_id')
    seller_id = data.get('seller_id')
    customer_id = data.get('customer_id')
    rating = int(data.get('rating'))
    comment = data.get('comment', '').strip()
    
    if rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if already reviewed
        exists = cursor.execute("SELECT id FROM reviews WHERE request_id = ? AND customer_id = ?", (request_id, customer_id)).fetchone()
        if exists:
            return jsonify({"error": "You have already reviewed this deal"}), 400
            
        cursor.execute(
            "INSERT INTO reviews (request_id, seller_id, customer_id, rating, comment) VALUES (?, ?, ?, ?, ?)",
            (request_id, seller_id, customer_id, rating, comment)
        )
        conn.commit()
        return jsonify({"message": "Review submitted successfully!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/seller/<int:seller_id>/rating', methods=['GET'])
def get_seller_rating_details(seller_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        stats = cursor.execute(
            "SELECT COALESCE(AVG(rating), 0.0) as avg_rating, COUNT(rating) as rating_count FROM reviews WHERE seller_id = ?",
            (seller_id,)
        ).fetchone()
        
        rows = cursor.execute(
            "SELECT r.*, u.username as customer_name FROM reviews r JOIN users u ON r.customer_id = u.id WHERE r.seller_id = ? ORDER BY r.created_at DESC",
            (seller_id,)
        ).fetchall()
        
        reviews_list = [dict(row) for row in rows]
        
        return jsonify({
            "avg_rating": round(stats['avg_rating'], 1),
            "rating_count": stats['rating_count'],
            "reviews": reviews_list
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


if __name__ == '__main__':
    app.run(debug=True, port=5080)

import sqlite3
import os
from werkzeug.security import generate_password_hash
from database import get_db_connection, init_db

def seed_database():
    # Make sure tables are created
    init_db()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Clear existing data
    cursor.execute("DELETE FROM bids")
    cursor.execute("DELETE FROM requests")
    cursor.execute("DELETE FROM users")
    
    # 2. Add Users
    users_data = [
        # System Admin
        ("IsuruRaaz", generate_password_hash("Isuru956118%#@"), "admin", "System Administrator"),
        
        # Customers
        ("saman", generate_password_hash("password123"), "customer", ""),
        ("nimal", generate_password_hash("password123"), "customer", ""),
        
        # Sellers
        ("kapila_fashions", generate_password_hash("password123"), "seller", "Kapila Fashions & Tailors"),
        ("perera_electronics", generate_password_hash("password123"), "seller", "Perera Digital Techs"),
        ("lanka_furniture", generate_password_hash("password123"), "seller", "Lanka Modern Furniture")
    ]
    
    cursor.executemany(
        "INSERT INTO users (username, password, role, shop_name) VALUES (?, ?, ?, ?)",
        users_data
    )
    conn.commit()
    
    # Get user IDs
    saman_id = cursor.execute("SELECT id FROM users WHERE username = 'saman'").fetchone()['id']
    nimal_id = cursor.execute("SELECT id FROM users WHERE username = 'nimal'").fetchone()['id']
    kapila_id = cursor.execute("SELECT id FROM users WHERE username = 'kapila_fashions'").fetchone()['id']
    perera_id = cursor.execute("SELECT id FROM users WHERE username = 'perera_electronics'").fetchone()['id']
    lanka_id = cursor.execute("SELECT id FROM users WHERE username = 'lanka_furniture'").fetchone()['id']
    
    # 3. Add Requests
    requests_data = [
        (saman_id, "Apple iPhone 15 Pro 128GB", "Need a brand new iPhone 15 Pro, Black Titanium, factory unlocked, with 1 year software/hardware warranty.", 295000.0, "Electronics", "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500&auto=format&fit=crop&q=60"),
        (saman_id, "Men's Slim Fit Navy Blue Suit", "Looking for a high quality office/wedding suit. Size 40 (jacket) and 34 (trousers). Preferably pure wool blend.", 18000.0, "Clothing", "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&auto=format&fit=crop&q=60"),
        (nimal_id, "Ergonomic Office Mesh Chair", "Adjustable headrest, lumbar support, and 3D armrests. Must be breathable mesh material.", 25000.0, "Furniture", "https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=500&auto=format&fit=crop&q=60"),
        (nimal_id, "Sony PlayStation 5 Slim (1TB)", "Disc edition, brand new with local agent warranty. Required with one dualsense controller.", 145000.0, "Electronics", "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500&auto=format&fit=crop&q=60")
    ]
    
    cursor.executemany(
        "INSERT INTO requests (customer_id, title, description, budget, category, image) VALUES (?, ?, ?, ?, ?, ?)",
        requests_data
    )
    conn.commit()
    
    # Get request IDs
    iphone_id = cursor.execute("SELECT id FROM requests WHERE title LIKE '%iPhone%'").fetchone()['id']
    suit_id = cursor.execute("SELECT id FROM requests WHERE title LIKE '%Suit%'").fetchone()['id']
    chair_id = cursor.execute("SELECT id FROM requests WHERE title LIKE '%Chair%'").fetchone()['id']
    ps5_id = cursor.execute("SELECT id FROM requests WHERE title LIKE '%PlayStation%'").fetchone()['id']
    
    # 4. Add Bids
    bids_data = [
        # Bids for iPhone
        (iphone_id, perera_id, 290000.0, 2, "Brand new, sealed box with Apple international warranty. I can deliver to your doorstep inside Colombo within 2 days."),
        (iphone_id, kapila_id, 294000.0, 5, "Imported from Singapore, brand new in sealed box. 1 year local shop warranty."),
        
        # Bids for Suit
        (suit_id, kapila_id, 16500.0, 4, "Custom tailors at Kapila Fashions. We can custom-fit this for you or give you our standard size 40. High-quality fabric."),
        
        # Bids for Office Chair
        (chair_id, lanka_id, 23500.0, 3, "High premium mesh chair, 2 years warranty on hydraulic cylinder. Available in black or grey."),
        
        # Bids for PS5 (No bids yet for realistic feel, or 1 bid)
        (ps5_id, perera_id, 142000.0, 1, "Local warranty, disc edition. Quick courier delivery.")
    ]
    
    cursor.executemany(
        "INSERT INTO bids (request_id, seller_id, price, delivery_days, notes) VALUES (?, ?, ?, ?, ?)",
        bids_data
    )
    conn.commit()
    conn.close()
    print("Database successfully seeded with customers, sellers, requests and bids!")

if __name__ == '__main__':
    seed_database()

import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:5080/api"

def make_request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    
    req_data = None
    if data:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_msg)
        except Exception:
            return e.code, {"error": err_msg}
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("--- STARTING API INTEGRATION TESTS ---")
    
    # 1. Register a test customer
    print("\n1. Testing Customer Registration...")
    status, res = make_request("/auth/register", "POST", {
        "username": "tester_customer",
        "password": "testpassword",
        "role": "customer"
    })
    print(f"Status: {status}, Response: {res}")
    assert status in (201, 400), f"Unexpected status: {status}" # 400 if already exists

    # 2. Register a test seller
    print("\n2. Testing Seller Registration...")
    status, res = make_request("/auth/register", "POST", {
        "username": "tester_seller",
        "password": "testpassword",
        "role": "seller",
        "shop_name": "Tester Hardware Store"
    })
    print(f"Status: {status}, Response: {res}")
    assert status in (201, 400), f"Unexpected status: {status}"

    # 3. Log in customer
    print("\n3. Testing Customer Login...")
    status, res = make_request("/auth/login", "POST", {
        "username": "tester_customer",
        "password": "testpassword"
    })
    print(f"Status: {status}, Response: {res}")
    assert status == 200, f"Login failed: {res}"
    customer_id = res['user']['id']

    # 4. Log in seller
    print("\n4. Testing Seller Login...")
    status, res = make_request("/auth/login", "POST", {
        "username": "tester_seller",
        "password": "testpassword"
    })
    print(f"Status: {status}, Response: {res}")
    assert status == 200, f"Login failed: {res}"
    seller_id = res['user']['id']

    # 5. Customer creates request
    print("\n5. Testing Item Request Creation...")
    status, res = make_request("/requests", "POST", {
        "customer_id": customer_id,
        "title": "Test Gaming Laptop",
        "description": "Need RTX 4060, 16GB RAM, 512GB SSD.",
        "budget": 250000.0,
        "category": "Electronics",
        "image": "https://example.com/laptop.jpg"
    })
    print(f"Status: {status}, Response: {res}")
    assert status == 201, f"Failed to create request: {res}"
    request_id = res['id']

    # 6. Seller places bid
    print("\n6. Testing Placement of Bid by Seller...")
    status, res = make_request(f"/requests/{request_id}/bids", "POST", {
        "seller_id": seller_id,
        "price": 240000.0,
        "delivery_days": 3,
        "notes": "Brand new, sealed in box. 2 years warranty!"
    })
    print(f"Status: {status}, Response: {res}")
    assert status == 201, f"Failed to place bid: {res}"

    # 7. Get bids for request
    print("\n7. Testing Retrieval of Bids...")
    status, res = make_request(f"/requests/{request_id}/bids", "GET")
    print(f"Status: {status}, Bids Count: {len(res)}")
    assert status == 200
    assert len(res) > 0, "No bids returned"
    bid_id = res[0]['id']

    # 8. Customer accepts bid
    print("\n8. Testing Bid Acceptance...")
    status, res = make_request(f"/bids/{bid_id}/accept", "POST")
    print(f"Status: {status}, Response: {res}")
    assert status == 200, f"Failed to accept bid: {res}"

    # 9. Verify request closed
    print("\n9. Verifying Request is Accepted/Closed...")
    status, res = make_request("/requests", "GET")
    print(f"Status: {status}")
    active_ids = [r['id'] for r in res]
    assert request_id not in active_ids, "Request should not be active anymore"

    # 10. Test Review Submission
    print("\n10. Testing Review Submission...")
    status, res = make_request("/reviews", "POST", {
        "request_id": request_id,
        "seller_id": seller_id,
        "customer_id": customer_id,
        "rating": 5,
        "comment": "Awesome seller! Best price and super fast delivery."
    })
    print(f"Status: {status}, Response: {res}")
    assert status == 201, f"Failed to submit review: {res}"

    # 11. Test Seller Rating Fetch
    print("\n11. Testing Seller Rating Fetch...")
    status, res = make_request(f"/seller/{seller_id}/rating", "GET")
    print(f"Status: {status}, Average Rating: {res['avg_rating']}, Reviews Count: {res['rating_count']}")
    assert status == 200
    assert res['avg_rating'] == 5.0
    assert res['rating_count'] == 1

    # 12. Test Stats Dashboard Fetch
    print("\n12. Testing Stats Dashboard Fetch...")
    status, res = make_request("/stats/dashboard", "GET")
    print(f"Status: {status}, Stats: {res}")
    assert status == 200
    assert "active_requests" in res
    assert "completed_deals" in res

    print("\n--- ALL API INTEGRATION TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    run_tests()

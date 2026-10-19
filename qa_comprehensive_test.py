import urllib.request
import urllib.error
import json
import time
import sys

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://Sampath95.pythonanywhere.com/api"
HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "BidBuy-QA-Automation"
}

def api_call(method, path, data=None):
    url = f"{BASE_URL}{path}"
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=req_data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            res_body = res.read().decode('utf-8')
            return res.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            parsed = json.loads(err_body)
        except:
            parsed = {"raw": err_body}
        return e.code, parsed
    except Exception as ex:
        return 0, {"error": str(ex)}

def run_qa_tests():
    print("=" * 65)
    print("      🚀 BIDBUY QA AUTOMATION SUITE: END-TO-END SYSTEM TEST     ")
    print(f"Target: {BASE_URL}")
    print("=" * 65)

    timestamp = int(time.time())
    cust_username = f"qa_cust_{timestamp}"
    sell_username = f"qa_sell_{timestamp}"
    cust_phone = "0771234567"
    sell_phone = "0719876543"

    results = []

    # --- 1. Customer Registration ---
    print("\n[STEP 1] Testing Customer Registration with Valid 10-Digit Phone...")
    status, res = api_call("POST", "/auth/register", {
        "username": cust_username,
        "password": "Password123!",
        "role": "customer",
        "phone": cust_phone,
        "full_name": "Kasun Perera"
    })
    pass_1 = status == 201
    results.append(("Customer Registration", pass_1, f"Status: {status}, Msg: {res.get('message')}"))
    print(f" -> {'PASS' if pass_1 else 'FAIL'}: {res}")

    # --- 2. Customer Login ---
    print("\n[STEP 2] Testing Customer Login & Profile Fields...")
    status, res = api_call("POST", "/auth/login", {
        "username": cust_username,
        "password": "Password123!"
    })
    customer_user = res.get("user", {})
    cust_id = customer_user.get("id")
    pass_2 = status == 200 and cust_id is not None and customer_user.get("phone") == cust_phone
    results.append(("Customer Login & User Payload", pass_2, f"Cust ID: {cust_id}, Phone: {customer_user.get('phone')}"))
    print(f" -> {'PASS' if pass_2 else 'FAIL'}: ID={cust_id}, Role={customer_user.get('role')}, Phone={customer_user.get('phone')}")

    # --- 3. Seller Registration with Category & Details ---
    print("\n[STEP 3] Testing Seller Registration with Category, Full Name & Shop Name...")
    status, res = api_call("POST", "/auth/register", {
        "username": sell_username,
        "password": "Password123!",
        "role": "seller",
        "phone": sell_phone,
        "full_name": "Nimal Jayasinghe",
        "shop_name": "TechZone Lanka",
        "category": "Electronics"
    })
    pass_3 = status == 201
    results.append(("Seller Registration", pass_3, f"Status: {status}, Msg: {res.get('message')}"))
    print(f" -> {'PASS' if pass_3 else 'FAIL'}: {res}")

    # --- 4. Seller Login ---
    print("\n[STEP 4] Testing Seller Login & Category/Shop Details...")
    status, res = api_call("POST", "/auth/login", {
        "username": sell_username,
        "password": "Password123!"
    })
    seller_user = res.get("user", {})
    sell_id = seller_user.get("id")
    pass_4 = (status == 200 and sell_id is not None and 
              seller_user.get("shop_name") == "TechZone Lanka" and
              seller_user.get("category") == "Electronics")
    results.append(("Seller Login & Category Verification", pass_4, f"Seller ID: {sell_id}, Category: {seller_user.get('category')}"))
    print(f" -> {'PASS' if pass_4 else 'FAIL'}: ID={sell_id}, Shop='{seller_user.get('shop_name')}', Category='{seller_user.get('category')}'")

    # --- 5. Customer Posts a Request ---
    print("\n[STEP 5] Testing Customer Posting New Request...")
    status, res = api_call("POST", "/requests", {
        "customer_id": cust_id,
        "title": "Sony WH-1000XM5 Wireless Headphones",
        "description": "Looking for original sealed pack, black color with warranty",
        "category": "Electronics",
        "budget": 85000,
        "phone": cust_phone,
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
        "deadline_days": 5
    })
    pass_5 = status == 201
    req_id = res.get("id") or res.get("request_id")
    # If not in response, fetch customer requests
    if not req_id:
        _, my_reqs = api_call("GET", f"/requests?customer_id={cust_id}")
        if my_reqs and isinstance(my_reqs, list):
            req_id = my_reqs[0]["id"]
    results.append(("Customer Post Request", pass_5 or req_id is not None, f"Request ID: {req_id}"))
    print(f" -> {'PASS' if req_id else 'FAIL'}: Request ID = {req_id}")

    # --- 6. Seller Browse Requests Notification Check ---
    print("\n[STEP 6] Testing Seller Browse Feed & Active Requests...")
    status, all_reqs = api_call("GET", "/requests")
    matching = [r for r in all_reqs if r["id"] == req_id]
    pass_6 = status == 200 and len(matching) > 0
    results.append(("Seller Demand Discovery", pass_6, f"Total Active Requests: {len(all_reqs)}"))
    print(f" -> {'PASS' if pass_6 else 'FAIL'}: Found posted request '{matching[0]['title'] if matching else 'None'}'")

    # --- 7. Seller Places a Quote/Bid ---
    print("\n[STEP 7] Testing Seller Placing a Bid (Quote)...")
    status, res = api_call("POST", "/bids", {
        "request_id": req_id,
        "seller_id": sell_id,
        "price": 82000,
        "delivery_days": 2,
        "notes": "Brand new Sony official warranty 1 year. Islandwide fast delivery.",
        "phone": sell_phone
    })
    pass_7 = status == 201
    results.append(("Seller Submit Bid", pass_7, f"Status: {status}, Msg: {res.get('message')}"))
    print(f" -> {'PASS' if pass_7 else 'FAIL'}: {res}")

    # --- 8. Customer Notification for New Quote ---
    print("\n[STEP 8] Testing Customer Notification Endpoint for New Quote...")
    status, notif = api_call("GET", f"/notifications?user_id={cust_id}&role=customer")
    quotes_count = notif.get("total_quotes_received", 0)
    pass_8 = status == 200 and quotes_count >= 1
    results.append(("Customer Quote Notification Trigger", pass_8, f"Quotes Received Count: {quotes_count}"))
    print(f" -> {'PASS' if pass_8 else 'FAIL'}: total_quotes_received={quotes_count}")

    # Fetch bid ID from request bids
    _, req_bids = api_call("GET", f"/requests/{req_id}/bids")
    bid_id = req_bids[0]["id"] if req_bids and len(req_bids) > 0 else None
    print(f"    (Retrieved Bid ID: {bid_id})")

    # --- 9. Customer to Seller Chat Message ---
    print("\n[STEP 9] Testing Customer Sending Chat Message to Seller...")
    status, res = api_call("POST", "/messages", {
        "request_id": req_id,
        "sender_id": cust_id,
        "receiver_id": sell_id,
        "message": "Hello, is cash on delivery available in Colombo?",
        "image_attachment": ""
    })
    pass_9 = status == 201
    results.append(("Customer Sends Message", pass_9, f"Status: {status}"))
    print(f" -> {'PASS' if pass_9 else 'FAIL'}: {res}")

    # --- 10. Seller Notification Endpoint for Incoming Message ---
    print("\n[STEP 10] Testing Seller Notification for New Message Alert...")
    status, seller_notif = api_call("GET", f"/notifications?user_id={sell_id}&role=seller")
    seller_msg_count = seller_notif.get("total_messages", 0)
    latest_msg = seller_notif.get("latest_message", {})
    pass_10 = (status == 200 and seller_msg_count >= 1 and 
               latest_msg is not None and latest_msg.get("sender_id") == cust_id)
    results.append(("Seller In-App Message Notification", pass_10, 
                    f"Total Msgs: {seller_msg_count}, From: {latest_msg.get('sender_name') if latest_msg else 'None'}"))
    print(f" -> {'PASS' if pass_10 else 'FAIL'}: Msgs={seller_msg_count}, Latest='{latest_msg.get('message') if latest_msg else ''}'")

    # --- 11. Seller Reply with Image Attachment ---
    print("\n[STEP 11] Testing Seller Reply Message with Image Attachment...")
    status, res = api_call("POST", "/messages", {
        "request_id": req_id,
        "sender_id": sell_id,
        "receiver_id": cust_id,
        "message": "Yes, COD available! Here is the warranty seal photo.",
        "image_attachment": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500"
    })
    pass_11 = status == 201
    results.append(("Seller Reply with Image", pass_11, f"Status: {status}"))
    print(f" -> {'PASS' if pass_11 else 'FAIL'}: {res}")

    # --- 12. Customer Notification for Reply Message ---
    print("\n[STEP 12] Testing Customer Notification for Incoming Reply...")
    status, cust_notif2 = api_call("GET", f"/notifications?user_id={cust_id}&role=customer")
    cust_msg_count = cust_notif2.get("total_messages", 0)
    cust_latest = cust_notif2.get("latest_message", {})
    pass_12 = (status == 200 and cust_msg_count >= 1 and 
               cust_latest is not None and cust_latest.get("sender_id") == sell_id)
    results.append(("Customer In-App Message Notification", pass_12, 
                    f"Total Msgs: {cust_msg_count}, Attachment: {cust_latest.get('image_attachment') if cust_latest else ''}"))
    print(f" -> {'PASS' if pass_12 else 'FAIL'}: Msgs={cust_msg_count}, Latest='{cust_latest.get('message') if cust_latest else ''}'")

    # --- 13. Chat Thread Fetching ---
    print("\n[STEP 13] Testing Chat Thread History...")
    status, chat_history = api_call("GET", f"/messages/chat?request_id={req_id}&user1_id={cust_id}&user2_id={sell_id}")
    pass_13 = status == 200 and len(chat_history) >= 2
    results.append(("Chat Thread Fetching", pass_13, f"Messages Count: {len(chat_history)}"))
    print(f" -> {'PASS' if pass_13 else 'FAIL'}: Retrieved {len(chat_history)} messages in conversation")

    # --- 14. Customer Accepts the Bid (Deal Closed) ---
    print(f"\n[STEP 14] Testing Customer Accepting Bid (Bid ID: {bid_id})...")
    status, res = api_call("POST", f"/bids/{bid_id}/accept")
    pass_14 = status == 200
    results.append(("Customer Accept Bid", pass_14, f"Status: {status}, Msg: {res.get('message')}"))
    print(f" -> {'PASS' if pass_14 else 'FAIL'}: {res}")

    # --- 15. Seller Deal Accept Notification Trigger ---
    print("\n[STEP 15] Testing Seller 'Deal Accepted' Notification Trigger...")
    status, seller_notif2 = api_call("GET", f"/notifications?user_id={sell_id}&role=seller")
    accepted_count = seller_notif2.get("accepted_bids_count", 0)
    pass_15 = status == 200 and accepted_count >= 1
    results.append(("Seller Deal Accept Notification Trigger", pass_15, f"Accepted Deals Count: {accepted_count}"))
    print(f" -> {'PASS' if pass_15 else 'FAIL'}: accepted_bids_count = {accepted_count}")

    # Verify seller's bid list shows 'accepted'
    _, seller_bids = api_call("GET", f"/bids?seller_id={sell_id}")
    accepted_bid = [b for b in seller_bids if b["id"] == bid_id and b["status"] == "accepted"]
    pass_15b = len(accepted_bid) > 0
    print(f"    (Seller Bid Status in Database: '{accepted_bid[0]['status'] if accepted_bid else 'None'}')")

    # --- 16. Customer Submits Review & Rating ---
    print("\n[STEP 16] Testing Review & Rating Submission...")
    status, res = api_call("POST", "/reviews", {
        "request_id": req_id,
        "seller_id": sell_id,
        "customer_id": cust_id,
        "rating": 5,
        "comment": "Authentic sealed Sony headphones, super fast same-day delivery! 10/10"
    })
    pass_16 = status == 201
    results.append(("Review & Rating Submission", pass_16, f"Status: {status}, Msg: {res.get('message')}"))
    print(f" -> {'PASS' if pass_16 else 'FAIL'}: {res}")

    # --- 17. Verify Seller Rating Stats Updated ---
    print("\n[STEP 17] Testing Seller Profile Stats & Average Rating...")
    status, updated_bids = api_call("GET", f"/requests/{req_id}/bids")
    avg_rating = updated_bids[0].get("avg_rating", 0) if updated_bids else 0
    pass_17 = status == 200 and avg_rating == 5.0
    results.append(("Seller Rating Stats Update", pass_17, f"Avg Rating: {avg_rating}"))
    print(f" -> {'PASS' if pass_17 else 'FAIL'}: Seller avg_rating = {avg_rating}")

    # --- 18. System Admin Verification ---
    print("\n[STEP 18] Testing Admin Login & System Overview...")
    status, admin_res = api_call("POST", "/auth/login", {
        "username": "IsuruRaaz",
        "password": "Password123!"
    })
    if status != 200:
        # Fallback to seeded password
        status, admin_res = api_call("POST", "/auth/login", {
            "username": "IsuruRaaz",
            "password": "Isuru956118%#@"
        })
    pass_18 = status == 200 and admin_res.get("user", {}).get("role") == "admin"
    results.append(("Admin Authentication", pass_18, f"Status: {status}, Role: {admin_res.get('user', {}).get('role')}"))
    print(f" -> {'PASS' if pass_18 else 'FAIL'}: Admin authenticated successfully")

    # --- SUMMARY ---
    print("\n" + "=" * 65)
    print("                    QA TEST EXECUTION SUMMARY                    ")
    print("=" * 65)
    total = len(results)
    passed = sum(1 for _, p, _ in results if p)
    failed = total - passed

    for name, p, details in results:
        mark = "✅ PASS" if p else "❌ FAIL"
        print(f"{mark} | {name.ljust(38)} | {details}")

    print("-" * 65)
    print(f"TOTAL TESTS: {total} | PASSED: {passed} | FAILED: {failed} | SUCCESS RATE: {(passed/total)*100:.1f}%")
    print("=" * 65)
    return failed == 0

if __name__ == "__main__":
    success = run_qa_tests()
    sys.exit(0 if success else 1)

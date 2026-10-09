"""Full end-to-end test of evidence deletion with proper auth."""
import requests
import json

BASE = "http://localhost:8000/api/v1"

# Step 1: Login as a system admin
print("=== Step 1: Login ===")
login_data = {"email": "admin@meil.co.in", "password": "MEILAdmin@123"}
r = requests.post(f"{BASE}/auth/login", json=login_data, timeout=10)
print(f"Login: {r.status_code}")
if r.status_code != 200:
    # Try alternate credentials
    login_data = {"email": "superadmin@aarohan.tech", "password": "AarohanAdmin@123"}
    r = requests.post(f"{BASE}/auth/login", json=login_data, timeout=10)
    print(f"Login (alt): {r.status_code}")
    if r.status_code != 200:
        print("Response:", r.text[:300])

if r.status_code == 200:
    token = r.json().get("access_token") or r.json().get("token")
    print(f"Token: {token[:30]}...")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Step 2: List evidence
    print("\n=== Step 2: List evidence ===")
    r = requests.get(f"{BASE}/evidence", headers=headers, timeout=10)
    print(f"List: {r.status_code}")
    if r.status_code == 200:
        evidence_list = r.json()
        print(f"Total evidence items: {len(evidence_list)}")
        active = [e for e in evidence_list if not e.get("is_deleted")]
        print(f"Active items: {len(active)}")
        if active:
            target = active[0]
            eid = target["id"]
            print(f"Target for delete test: {eid} ({target.get('original_name', 'N/A')})")

            # Step 3: Try to delete (with wrong password to test 401 handling)
            print("\n=== Step 3: Delete test (wrong password) ===")
            r = requests.delete(
                f"{BASE}/evidence/{eid}",
                json={"password": "wrong_password", "reason": "Testing deletion"},
                headers=headers,
                timeout=10
            )
            print(f"Delete (wrong pw): {r.status_code}")
            print(f"Response: {r.text[:300]}")
            for k, v in r.headers.items():
                if "access-control" in k.lower():
                    print(f"  {k}: {v}")
        else:
            print("No active evidence items to test with.")
    else:
        print("Response:", r.text[:300])
else:
    print("Could not login. Skipping auth tests.")

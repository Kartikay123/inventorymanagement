"""Comprehensive HTTP verification against the LIVE running backend.

Targets the dockerized FastAPI + PostgreSQL stack over real HTTP (not TestClient).
Non-destructive: every entity it creates uses a unique suffix and is deleted at
the end. Exits non-zero on the first failure.

Usage:  BASE=http://localhost:8001 .venv/bin/python verify_live.py
"""

import os
import sys
import time

import httpx

BASE = os.environ.get("BASE", "http://localhost:8001")
SUFFIX = f"{int(time.time())}-{os.getpid()}"  # unique per run
c = httpx.Client(base_url=BASE, timeout=20.0)

PASS, FAIL = "\033[92mPASS\033[0m", "\033[91mFAIL\033[0m"
_n = {"p": 0, "f": 0}
created = {"products": [], "customers": [], "orders": []}


def check(label, cond):
    ok = bool(cond)
    _n["p" if ok else "f"] += 1
    print(f"  [{PASS if ok else FAIL}] {label}")
    if not ok:
        raise AssertionError(label)


def section(t):
    print(f"\n# {t}")


try:
    section("Health & root")
    check("GET / -> 200", c.get("/").status_code == 200)
    check("GET /health healthy", c.get("/health").json().get("status") == "healthy")
    check("OpenAPI docs reachable", c.get("/openapi.json").status_code == 200)

    section("Products — create / validation / uniqueness")
    r = c.post("/products", json={"name": "QA Widget", "sku": f"QA-{SUFFIX}", "price": 9.99, "quantity": 50})
    check("create product -> 201", r.status_code == 201)
    p1 = r.json()
    created["products"].append(p1["id"])
    check("response has id/created_at", "id" in p1 and "created_at" in p1)

    r = c.post("/products", json={"name": "Dup", "sku": f"qa-{SUFFIX}", "price": 1, "quantity": 1})
    check("duplicate SKU (case-insensitive) -> 409", r.status_code == 409)
    r = c.post("/products", json={"name": "Neg", "sku": f"NEG-{SUFFIX}", "price": 5, "quantity": -3})
    check("negative quantity -> 422", r.status_code == 422)
    r = c.post("/products", json={"name": "NegP", "sku": f"NP-{SUFFIX}", "price": -1, "quantity": 1})
    check("negative price -> 422", r.status_code == 422)
    r = c.post("/products", json={"name": "  ", "sku": f"BLK-{SUFFIX}", "price": 1, "quantity": 1})
    check("blank name -> 422", r.status_code == 422)
    r = c.post("/products", json={"name": "NoSku", "price": 1, "quantity": 1})
    check("missing sku -> 422", r.status_code == 422)

    r = c.post("/products", json={"name": "QA Gadget", "sku": f"QG-{SUFFIX}", "price": 19.5, "quantity": 5})
    p2 = r.json()
    created["products"].append(p2["id"])
    check("second product created", r.status_code == 201)

    section("Products — read / update / delete")
    check("GET /products is a list", isinstance(c.get("/products").json(), list))
    check("GET /products/{id} -> 200", c.get(f"/products/{p1['id']}").status_code == 200)
    check("GET missing product -> 404", c.get("/products/999999").status_code == 404)
    check("search filter works", any(p["id"] == p1["id"] for p in c.get("/products", params={"search": "QA Widget"}).json()))

    r = c.put(f"/products/{p1['id']}", json={"price": 12.5, "quantity": 100})
    check("update product -> 200", r.status_code == 200 and r.json()["price"] == 12.5 and r.json()["quantity"] == 100)
    check("update name unchanged (partial)", r.json()["name"] == "QA Widget")
    r = c.put(f"/products/{p2['id']}", json={"sku": f"QA-{SUFFIX}"})
    check("update to existing SKU -> 409", r.status_code == 409)
    r = c.put("/products/999999", json={"price": 1})
    check("update missing product -> 404", r.status_code == 404)

    r = c.post("/products", json={"name": "Temp", "sku": f"TMP-{SUFFIX}", "price": 1, "quantity": 1})
    tmp = r.json()["id"]
    check("delete product -> 200", c.delete(f"/products/{tmp}").status_code == 200)
    check("deleted product -> 404", c.get(f"/products/{tmp}").status_code == 404)
    check("delete missing product -> 404", c.delete("/products/999999").status_code == 404)

    section("Customers — create / validation / uniqueness")
    r = c.post("/customers", json={"full_name": "QA Tester", "email": f"qa+{SUFFIX}@example.com", "phone": "+1-555-0100"})
    check("create customer -> 201", r.status_code == 201)
    cust = r.json()
    created["customers"].append(cust["id"])
    r = c.post("/customers", json={"full_name": "Dup", "email": f"QA+{SUFFIX}@example.com", "phone": "999"})
    check("duplicate email (case-insensitive) -> 409", r.status_code == 409)
    r = c.post("/customers", json={"full_name": "Bad", "email": "not-an-email", "phone": "1"})
    check("invalid email -> 422", r.status_code == 422)
    r = c.post("/customers", json={"full_name": "NoEmail", "phone": "1"})
    check("missing email -> 422", r.status_code == 422)
    check("GET /customers list", isinstance(c.get("/customers").json(), list))
    check("GET /customers/{id} -> 200", c.get(f"/customers/{cust['id']}").status_code == 200)
    check("GET missing customer -> 404", c.get("/customers/999999").status_code == 404)

    section("Orders — business logic (stock, totals)")
    p1_before = c.get(f"/products/{p1['id']}").json()["quantity"]  # 100
    p2_before = c.get(f"/products/{p2['id']}").json()["quantity"]  # 5
    r = c.post("/orders", json={"customer_id": cust["id"], "items": [
        {"product_id": p1["id"], "quantity": 2},
        {"product_id": p2["id"], "quantity": 3},
    ]})
    check("create order -> 201", r.status_code == 201)
    order = r.json()
    created["orders"].append(order["id"])
    expected = round(12.5 * 2 + 19.5 * 3, 2)
    check(f"backend auto-total == {expected}", round(order["total_amount"], 2) == expected)
    check("order has 2 line items", len(order["items"]) == 2)
    check("order embeds customer name", order["customer"]["full_name"] == "QA Tester")
    check("line item embeds product", order["items"][0]["product"] is not None)
    check("subtotal computed", order["items"][0]["subtotal"] == order["items"][0]["unit_price"] * order["items"][0]["quantity"])

    check("stock decremented p1 (-2)", c.get(f"/products/{p1['id']}").json()["quantity"] == p1_before - 2)
    check("stock decremented p2 (-3)", c.get(f"/products/{p2['id']}").json()["quantity"] == p2_before - 3)

    r = c.post("/orders", json={"customer_id": cust["id"], "items": [{"product_id": p2["id"], "quantity": 9999}]})
    check("insufficient stock -> 400", r.status_code == 400)
    check("error names the product", "QA Gadget" in r.json().get("detail", ""))
    r = c.post("/orders", json={"customer_id": 999999, "items": [{"product_id": p1["id"], "quantity": 1}]})
    check("missing customer -> 404", r.status_code == 404)
    r = c.post("/orders", json={"customer_id": cust["id"], "items": [{"product_id": 999999, "quantity": 1}]})
    check("missing product -> 404", r.status_code == 404)
    r = c.post("/orders", json={"customer_id": cust["id"], "items": []})
    check("empty items -> 422", r.status_code == 422)
    r = c.post("/orders", json={"customer_id": cust["id"], "items": [
        {"product_id": p1["id"], "quantity": 1}, {"product_id": p1["id"], "quantity": 1}]})
    check("duplicate product in order -> 422", r.status_code == 422)
    r = c.post("/orders", json={"customer_id": cust["id"], "items": [{"product_id": p1["id"], "quantity": 0}]})
    check("zero quantity -> 422", r.status_code == 422)

    check("GET /orders list", isinstance(c.get("/orders").json(), list))
    check("GET /orders/{id} -> 200", c.get(f"/orders/{order['id']}").status_code == 200)
    check("GET missing order -> 404", c.get("/orders/999999").status_code == 404)

    section("Referential integrity guards")
    check("delete product used in order -> 409", c.delete(f"/products/{p1['id']}").status_code == 409)
    check("delete customer with order -> 409", c.delete(f"/customers/{cust['id']}").status_code == 409)

    section("Cancel order restores stock")
    check("delete order -> 200", c.delete(f"/orders/{order['id']}").status_code == 200)
    created["orders"].remove(order["id"])
    check("stock restored p1", c.get(f"/products/{p1['id']}").json()["quantity"] == p1_before)
    check("stock restored p2", c.get(f"/products/{p2['id']}").json()["quantity"] == p2_before)

    section("Dashboard shape")
    d = c.get("/dashboard").json()
    for key in ["total_products", "total_customers", "total_orders", "low_stock_count",
                "out_of_stock_count", "total_inventory_value", "total_revenue",
                "low_stock_threshold", "low_stock_products", "recent_orders"]:
        check(f"dashboard has '{key}'", key in d)

finally:
    # ---- cleanup: orders -> customers -> products ----
    print("\n# Cleanup")
    for oid in list(created["orders"]):
        c.delete(f"/orders/{oid}")
    for cid in list(created["customers"]):
        c.delete(f"/customers/{cid}")
    for pid in list(created["products"]):
        c.delete(f"/products/{pid}")
    print(f"  removed {len(created['products'])} products, "
          f"{len(created['customers'])} customers, {len(created['orders'])} orders")
    c.close()

print(f"\n==== {_n['p']} passed, {_n['f']} failed ====")
sys.exit(1 if _n["f"] else 0)

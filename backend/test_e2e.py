"""End-to-end smoke test of every endpoint + business rule (SQLite, no server).

Run:  DATABASE_URL=sqlite:///./e2e.db SEED_DATA=false .venv/bin/python test_e2e.py
Exits non-zero on the first failed assertion.
"""

import sys

from fastapi.testclient import TestClient

from app.main import app

PASS, FAIL = "\033[92mPASS\033[0m", "\033[91mFAIL\033[0m"
_count = {"pass": 0, "fail": 0}


def check(label, cond):
    ok = bool(cond)
    _count["pass" if ok else "fail"] += 1
    print(f"  [{PASS if ok else FAIL}] {label}")
    if not ok:
        raise AssertionError(label)


with TestClient(app) as c:
    print("\n# Health & root")
    check("GET / -> 200", c.get("/").status_code == 200)
    check("GET /health healthy", c.get("/health").json()["status"] == "healthy")

    print("\n# Products: create / validation / uniqueness")
    r = c.post("/products", json={"name": "Widget", "sku": "W-1", "price": 9.99, "quantity": 50})
    check("create product -> 201", r.status_code == 201)
    p1 = r.json()
    check("returned id", isinstance(p1["id"], int))

    r = c.post("/products", json={"name": "Dup", "sku": "w-1", "price": 1, "quantity": 1})
    check("duplicate SKU (case-insensitive) -> 409", r.status_code == 409)

    r = c.post("/products", json={"name": "Neg", "sku": "N-1", "price": 5, "quantity": -3})
    check("negative quantity -> 422", r.status_code == 422)

    r = c.post("/products", json={"name": "NegPrice", "sku": "NP-1", "price": -5, "quantity": 1})
    check("negative price -> 422", r.status_code == 422)

    r = c.post("/products", json={"name": "  ", "sku": "B-1", "price": 1, "quantity": 1})
    check("blank name -> 422", r.status_code == 422)

    r = c.post("/products", json={"name": "Gadget", "sku": "G-1", "price": 19.5, "quantity": 5})
    p2 = r.json()
    check("second product created", r.status_code == 201)

    print("\n# Products: read / update / delete")
    check("GET /products lists 2", len(c.get("/products").json()) == 2)
    check("GET /products/{id} ok", c.get(f"/products/{p1['id']}").status_code == 200)
    check("GET missing product -> 404", c.get("/products/99999").status_code == 404)

    r = c.put(f"/products/{p1['id']}", json={"price": 12.5, "quantity": 100})
    check("update product -> 200", r.status_code == 200)
    check("update applied", r.json()["price"] == 12.5 and r.json()["quantity"] == 100)

    r = c.put(f"/products/{p2['id']}", json={"sku": "w-1"})
    check("update to existing SKU -> 409", r.status_code == 409)

    r = c.post("/products", json={"name": "Temp", "sku": "T-1", "price": 1, "quantity": 1})
    tmp_id = r.json()["id"]
    check("delete product -> 200", c.delete(f"/products/{tmp_id}").status_code == 200)
    check("deleted product gone -> 404", c.get(f"/products/{tmp_id}").status_code == 404)

    print("\n# Customers: create / validation / uniqueness")
    r = c.post("/customers", json={"full_name": "Jane Doe", "email": "jane@x.com", "phone": "12345"})
    check("create customer -> 201", r.status_code == 201)
    cust = r.json()
    r = c.post("/customers", json={"full_name": "J2", "email": "JANE@x.com", "phone": "999"})
    check("duplicate email (case-insensitive) -> 409", r.status_code == 409)
    r = c.post("/customers", json={"full_name": "Bad", "email": "not-an-email", "phone": "1"})
    check("invalid email -> 422", r.status_code == 422)
    check("GET /customers lists 1", len(c.get("/customers").json()) == 1)
    check("GET customer 404", c.get("/customers/99999").status_code == 404)

    print("\n# Orders: business logic")
    # stock before: p1=100, p2=5
    r = c.post("/orders", json={"customer_id": cust["id"], "items": [
        {"product_id": p1["id"], "quantity": 2},
        {"product_id": p2["id"], "quantity": 3},
    ]})
    check("create order -> 201", r.status_code == 201)
    order = r.json()
    expected_total = round(12.5 * 2 + 19.5 * 3, 2)
    check(f"auto total == {expected_total}", round(order["total_amount"], 2) == expected_total)
    check("order has 2 items", len(order["items"]) == 2)
    check("order embeds customer", order["customer"]["full_name"] == "Jane Doe")
    check("order item embeds product", order["items"][0]["product"] is not None)

    check("stock reduced p1 100->98", c.get(f"/products/{p1['id']}").json()["quantity"] == 98)
    check("stock reduced p2 5->2", c.get(f"/products/{p2['id']}").json()["quantity"] == 2)

    r = c.post("/orders", json={"customer_id": cust["id"], "items": [{"product_id": p2["id"], "quantity": 999}]})
    check("insufficient stock -> 400", r.status_code == 400)

    r = c.post("/orders", json={"customer_id": 99999, "items": [{"product_id": p1["id"], "quantity": 1}]})
    check("missing customer -> 404", r.status_code == 404)

    r = c.post("/orders", json={"customer_id": cust["id"], "items": [{"product_id": 99999, "quantity": 1}]})
    check("missing product -> 404", r.status_code == 404)

    r = c.post("/orders", json={"customer_id": cust["id"], "items": []})
    check("empty items -> 422", r.status_code == 422)

    r = c.post("/orders", json={"customer_id": cust["id"], "items": [
        {"product_id": p1["id"], "quantity": 1}, {"product_id": p1["id"], "quantity": 1}]})
    check("duplicate product in order -> 422", r.status_code == 422)

    check("GET /orders lists 1", len(c.get("/orders").json()) == 1)
    check("GET /orders/{id} ok", c.get(f"/orders/{order['id']}").status_code == 200)
    check("GET missing order -> 404", c.get("/orders/99999").status_code == 404)

    print("\n# Referential integrity guards")
    check("delete product in order -> 409", c.delete(f"/products/{p1['id']}").status_code == 409)
    check("delete customer with order -> 409", c.delete(f"/customers/{cust['id']}").status_code == 409)

    print("\n# Cancel order restores stock")
    check("delete order -> 200", c.delete(f"/orders/{order['id']}").status_code == 200)
    check("stock restored p1 -> 100", c.get(f"/products/{p1['id']}").json()["quantity"] == 100)
    check("stock restored p2 -> 5", c.get(f"/products/{p2['id']}").json()["quantity"] == 5)
    check("customer now deletable", c.delete(f"/customers/{cust['id']}").status_code == 200)

    print("\n# Dashboard")
    d = c.get("/dashboard").json()
    check("dashboard total_products == 2", d["total_products"] == 2)
    check("dashboard has low_stock_products", "low_stock_products" in d)
    check("dashboard inventory_value numeric", isinstance(d["total_inventory_value"], (int, float)))

print(f"\n==== {_count['pass']} passed, {_count['fail']} failed ====")
sys.exit(1 if _count["fail"] else 0)

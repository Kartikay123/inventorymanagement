"""Seed the database with a small, realistic demo dataset.

Runs automatically on first startup (when SEED_DATA is enabled and the database
is empty) so the dashboard and lists are populated for reviewers out of the box.
Safe to call repeatedly — it is a no-op if any products already exist.
"""

from decimal import Decimal

from sqlalchemy.orm import Session

from . import models
from .database import SessionLocal

_PRODUCTS = [
    {"name": "Wireless Mouse", "sku": "WM-001", "price": 24.99, "quantity": 120,
     "description": "Ergonomic 2.4GHz wireless mouse with silent click."},
    {"name": "Mechanical Keyboard", "sku": "KB-100", "price": 89.50, "quantity": 45,
     "description": "RGB backlit mechanical keyboard, brown switches."},
    {"name": "27\" 4K Monitor", "sku": "MON-27UHD", "price": 329.00, "quantity": 18,
     "description": "27-inch UHD IPS monitor with USB-C."},
    {"name": "USB-C Hub", "sku": "HUB-7IN1", "price": 39.99, "quantity": 8,
     "description": "7-in-1 USB-C hub with HDMI, SD and PD charging."},
    {"name": "Noise-Cancelling Headphones", "sku": "HP-NC700", "price": 199.99, "quantity": 30,
     "description": "Over-ear ANC headphones, 30h battery."},
    {"name": "Laptop Stand", "sku": "LS-ALU", "price": 34.95, "quantity": 5,
     "description": "Adjustable aluminium laptop stand."},
    {"name": "1080p Webcam", "sku": "CAM-1080", "price": 59.00, "quantity": 0,
     "description": "Full-HD webcam with dual microphones."},
    {"name": "Portable SSD 1TB", "sku": "SSD-1TB", "price": 109.99, "quantity": 60,
     "description": "USB 3.2 portable SSD, up to 1050MB/s."},
]

_CUSTOMERS = [
    {"full_name": "Alice Johnson", "email": "alice.johnson@example.com",
     "phone": "+1-202-555-0101", "address": "123 Maple St, Springfield"},
    {"full_name": "Bob Martinez", "email": "bob.martinez@example.com",
     "phone": "+1-202-555-0142", "address": "88 Oak Avenue, Riverside"},
    {"full_name": "Chen Wei", "email": "chen.wei@example.com",
     "phone": "+1-202-555-0177", "address": "5 Bridge Road, Lakeside"},
]


def seed_if_empty() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(models.Product.id).first() is not None:
            return  # already seeded / has data

        products = [models.Product(**p) for p in _PRODUCTS]
        customers = [models.Customer(**c) for c in _CUSTOMERS]
        db.add_all(products + customers)
        db.flush()

        # One sample order: Alice buys 2 mice and 1 keyboard.
        mouse = next(p for p in products if p.sku == "WM-001")
        keyboard = next(p for p in products if p.sku == "KB-100")
        alice = customers[0]

        order = models.Order(customer_id=alice.id, status="confirmed")
        db.add(order)
        db.flush()

        total = Decimal("0.00")
        for product, qty in [(mouse, 2), (keyboard, 1)]:
            unit_price = Decimal(str(product.price))
            subtotal = unit_price * qty
            total += subtotal
            product.quantity -= qty
            db.add(
                models.OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=qty,
                    unit_price=unit_price,
                    subtotal=subtotal,
                )
            )
        order.total_amount = total

        db.commit()
        print("[seed] Inserted demo products, customers and a sample order.")
    finally:
        db.close()

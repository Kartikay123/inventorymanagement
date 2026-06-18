"""SQLAlchemy ORM models.

Schema overview
---------------
* Product      — catalog item with a unique SKU and tracked stock quantity.
* Customer     — buyer with a unique email.
* Order        — header row referencing a customer + computed total amount.
* OrderItem    — line item linking an order to a product (supports multiple
                 products per order, with a price snapshot for historical
                 accuracy even if the product price changes later).
"""

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from .database import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_product_quantity_non_negative"),
        CheckConstraint("price >= 0", name="ck_product_price_non_negative"),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    price = Column(Numeric(12, 2), nullable=False, default=0)
    quantity = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    order_items = relationship("OrderItem", back_populates="product")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    orders = relationship("Order", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    status = Column(String(50), nullable=False, default="confirmed")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="orders")
    # Deleting an order removes its line items (stock is restored in the router).
    items = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)  # price snapshot at order time
    subtotal = Column(Numeric(12, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

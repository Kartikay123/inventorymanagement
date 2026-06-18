"""Dashboard endpoint — aggregate summary metrics for the landing page."""

from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=schemas.DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    """Return totals, inventory value, revenue and low-stock highlights."""
    threshold = settings.LOW_STOCK_THRESHOLD

    total_products = db.query(func.count(models.Product.id)).scalar() or 0
    total_customers = db.query(func.count(models.Customer.id)).scalar() or 0
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0

    low_stock_count = (
        db.query(func.count(models.Product.id))
        .filter(models.Product.quantity <= threshold)
        .scalar()
        or 0
    )
    out_of_stock_count = (
        db.query(func.count(models.Product.id))
        .filter(models.Product.quantity <= 0)
        .scalar()
        or 0
    )

    # Total value of stock currently on hand (price * quantity summed in Python
    # to stay portable across SQLite and PostgreSQL numeric handling).
    inventory_value = Decimal("0.00")
    for price, quantity in db.query(models.Product.price, models.Product.quantity).all():
        inventory_value += Decimal(str(price)) * quantity

    total_revenue = db.query(func.coalesce(func.sum(models.Order.total_amount), 0)).scalar() or 0

    low_stock_products = (
        db.query(models.Product)
        .filter(models.Product.quantity <= threshold)
        .order_by(models.Product.quantity.asc())
        .limit(10)
        .all()
    )

    recent_orders = (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items).joinedload(models.OrderItem.product),
            joinedload(models.Order.customer),
        )
        .order_by(models.Order.created_at.desc())
        .limit(5)
        .all()
    )

    return schemas.DashboardStats(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        total_inventory_value=float(inventory_value),
        total_revenue=float(total_revenue),
        low_stock_threshold=threshold,
        low_stock_products=low_stock_products,
        recent_orders=recent_orders,
    )

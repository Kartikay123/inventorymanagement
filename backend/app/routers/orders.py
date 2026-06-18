"""Order management endpoints.

Business rules enforced here:
* The referenced customer and every referenced product must exist.
* Inventory must be sufficient for every line item (else 400).
* The order total is computed by the backend from current product prices.
* Creating an order atomically reduces stock; deleting one restores it.
"""

from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/orders", tags=["Orders"])


def _load_order(order_id: int, db: Session) -> models.Order:
    order = (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items).joinedload(models.OrderItem.product),
            joinedload(models.Order.customer),
        )
        .filter(models.Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with id {order_id} not found",
        )
    return order


@router.post("", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    """Create an order, validate stock, compute the total and decrement stock."""
    customer = db.get(models.Customer, payload.customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {payload.customer_id} not found",
        )

    # Validate every line item up front so we never partially mutate stock.
    line_items: List[dict] = []
    total = Decimal("0.00")
    for item in payload.items:
        product = db.get(models.Product, item.product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {item.product_id} not found",
            )
        if product.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for '{product.name}' (SKU {product.sku}): "
                    f"requested {item.quantity}, only {product.quantity} available"
                ),
            )
        unit_price = Decimal(str(product.price))
        subtotal = unit_price * item.quantity
        total += subtotal
        line_items.append(
            {"product": product, "quantity": item.quantity, "unit_price": unit_price, "subtotal": subtotal}
        )

    order = models.Order(customer_id=customer.id, total_amount=total, status="confirmed")
    db.add(order)
    db.flush()  # assign order.id without committing yet

    for li in line_items:
        product = li["product"]
        product.quantity -= li["quantity"]  # decrement stock
        db.add(
            models.OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=li["quantity"],
                unit_price=li["unit_price"],
                subtotal=li["subtotal"],
            )
        )

    db.commit()
    return _load_order(order.id, db)


@router.get("", response_model=List[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    """Retrieve all orders (newest first) with their line items and customer."""
    return (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items).joinedload(models.OrderItem.product),
            joinedload(models.Order.customer),
        )
        .order_by(models.Order.created_at.desc())
        .all()
    )


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Retrieve a single order with full details."""
    return _load_order(order_id, db)


@router.delete("/{order_id}", response_model=schemas.MessageResponse)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Cancel/delete an order and restore the stock it had reserved."""
    order = _load_order(order_id, db)

    for item in order.items:
        product = db.get(models.Product, item.product_id)
        if product is not None:
            product.quantity += item.quantity  # restock on cancellation

    db.delete(order)
    db.commit()
    return {"detail": f"Order {order_id} cancelled and stock restored"}

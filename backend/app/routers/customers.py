"""Customer management endpoints — create, list, retrieve, delete."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/customers", tags=["Customers"])


def _get_customer_or_404(customer_id: int, db: Session) -> models.Customer:
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with id {customer_id} not found",
        )
    return customer


@router.post("", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer. Email must be unique (case-insensitive)."""
    email = payload.email.lower()
    exists = db.query(
        db.query(models.Customer).filter(func.lower(models.Customer.email) == email).exists()
    ).scalar()
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A customer with email '{payload.email}' already exists",
        )

    data = payload.model_dump()
    data["email"] = email  # store normalized
    customer = models.Customer(**data)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("", response_model=List[schemas.CustomerOut])
def list_customers(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Filter by name or email"),
):
    """Retrieve all customers, with optional search."""
    query = db.query(models.Customer)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            (models.Customer.full_name.ilike(like)) | (models.Customer.email.ilike(like))
        )
    return query.order_by(models.Customer.created_at.desc()).all()


@router.get("/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Retrieve a single customer by ID."""
    return _get_customer_or_404(customer_id, db)


@router.delete("/{customer_id}", response_model=schemas.MessageResponse)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """Delete a customer. Blocked (409) if they have existing orders."""
    customer = _get_customer_or_404(customer_id, db)

    has_orders = db.query(
        db.query(models.Order).filter(models.Order.customer_id == customer_id).exists()
    ).scalar()
    if has_orders:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a customer who has existing orders",
        )

    db.delete(customer)
    db.commit()
    return {"detail": f"Customer {customer_id} deleted successfully"}

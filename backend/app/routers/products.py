"""Product management endpoints — full CRUD with unique-SKU enforcement."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/products", tags=["Products"])


def _get_product_or_404(product_id: int, db: Session) -> models.Product:
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found",
        )
    return product


def _ensure_sku_unique(sku: str, db: Session, exclude_id: Optional[int] = None) -> None:
    query = db.query(models.Product).filter(func.lower(models.Product.sku) == sku.lower())
    if exclude_id is not None:
        query = query.filter(models.Product.id != exclude_id)
    if db.query(query.exists()).scalar():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A product with SKU '{sku}' already exists",
        )


@router.post("", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    """Create a new product. SKU must be unique (case-insensitive)."""
    _ensure_sku_unique(payload.sku, db)
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("", response_model=List[schemas.ProductOut])
def list_products(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Filter by name or SKU"),
    low_stock: bool = Query(False, description="Only return products below the low-stock threshold"),
):
    """Retrieve all products, with optional search and low-stock filtering."""
    query = db.query(models.Product)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            (models.Product.name.ilike(like)) | (models.Product.sku.ilike(like))
        )
    if low_stock:
        query = query.filter(models.Product.quantity <= settings.LOW_STOCK_THRESHOLD)
    return query.order_by(models.Product.created_at.desc()).all()


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Retrieve a single product by ID."""
    return _get_product_or_404(product_id, db)


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)
):
    """Update product details. Only supplied fields are changed."""
    product = _get_product_or_404(product_id, db)
    data = payload.model_dump(exclude_unset=True)

    if "sku" in data and data["sku"].lower() != product.sku.lower():
        _ensure_sku_unique(data["sku"], db, exclude_id=product_id)

    for field, value in data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", response_model=schemas.MessageResponse)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product. Blocked (409) if it is referenced by any order."""
    product = _get_product_or_404(product_id, db)

    referenced = db.query(
        db.query(models.OrderItem).filter(models.OrderItem.product_id == product_id).exists()
    ).scalar()
    if referenced:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a product that is part of existing orders",
        )

    db.delete(product)
    db.commit()
    return {"detail": f"Product {product_id} deleted successfully"}

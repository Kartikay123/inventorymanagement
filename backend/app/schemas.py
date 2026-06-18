"""Pydantic v2 schemas for request validation and response serialization.

These provide the "validate all request data before processing" guarantee:
FastAPI rejects malformed payloads with a 422 before any handler runs.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Product name")
    sku: str = Field(..., min_length=1, max_length=100, description="Unique stock keeping unit")
    price: float = Field(..., ge=0, description="Unit price, must be >= 0")
    quantity: int = Field(..., ge=0, description="Quantity in stock, must be >= 0")
    description: Optional[str] = Field(None, max_length=2000)

    @field_validator("name", "sku")
    @classmethod
    def _strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be blank")
        return cleaned


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    """All fields optional — supports partial updates."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=2000)

    @field_validator("name", "sku")
    @classmethod
    def _strip_optional(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be blank")
        return cleaned


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class ProductBrief(BaseModel):
    """Compact product representation embedded inside order line items."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    price: float


# --------------------------------------------------------------------------- #
# Customers
# --------------------------------------------------------------------------- #
class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str = Field(..., min_length=3, max_length=50)
    address: Optional[str] = Field(None, max_length=500)

    @field_validator("full_name", "phone")
    @classmethod
    def _strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be blank")
        return cleaned


class CustomerCreate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class CustomerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
class OrderItemCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0, description="Units to order, must be > 0")


class OrderCreate(BaseModel):
    customer_id: int = Field(..., gt=0)
    items: List[OrderItemCreate] = Field(..., min_length=1, description="At least one line item")

    @field_validator("items")
    @classmethod
    def _no_duplicate_products(cls, items: List[OrderItemCreate]) -> List[OrderItemCreate]:
        product_ids = [item.product_id for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("each product may only appear once per order")
        return items


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price: float
    subtotal: float
    product: Optional[ProductBrief] = None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    total_amount: float
    status: str
    created_at: datetime
    items: List[OrderItemOut] = []
    customer: Optional[CustomerBrief] = None


# --------------------------------------------------------------------------- #
# Dashboard & generic responses
# --------------------------------------------------------------------------- #
class DashboardStats(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_count: int
    out_of_stock_count: int
    total_inventory_value: float
    total_revenue: float
    low_stock_threshold: int
    low_stock_products: List[ProductOut] = []
    recent_orders: List[OrderOut] = []


class MessageResponse(BaseModel):
    detail: str

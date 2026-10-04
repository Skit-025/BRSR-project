"""
app/core/pagination.py
Generic offset-based and cursor-based pagination helpers for SQLAlchemy queries.
"""
from typing import TypeVar, Generic, List, Optional, Type, Any
from math import ceil
from pydantic import BaseModel
from sqlalchemy.orm import Query

T = TypeVar("T")


# ── Request params ────────────────────────────────────────────────
class PaginationParams(BaseModel):
    page:     int = 1
    per_page: int = 25

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page


# ── Response envelope ─────────────────────────────────────────────
class Page(BaseModel, Generic[T]):
    items:       List[T]
    total:       int
    page:        int
    per_page:    int
    total_pages: int
    has_next:    bool
    has_prev:    bool

    model_config = {"arbitrary_types_allowed": True}


def paginate(query: Query, params: PaginationParams) -> Page:
    """
    Apply pagination to a SQLAlchemy Query object.

    Example:
        q = db.query(Submission).filter(Submission.period_id == period_id)
        page = paginate(q, PaginationParams(page=2, per_page=20))
    """
    total = query.count()
    items = query.offset(params.offset).limit(params.limit).all()
    total_pages = ceil(total / params.per_page) if params.per_page else 1

    return Page(
        items=items,
        total=total,
        page=params.page,
        per_page=params.per_page,
        total_pages=total_pages,
        has_next=params.page < total_pages,
        has_prev=params.page > 1,
    )


def paginate_list(items: list, params: PaginationParams) -> Page:
    """Paginate an already-loaded Python list (use only for small sets)."""
    total = len(items)
    total_pages = ceil(total / params.per_page) if params.per_page else 1
    start = params.offset
    end   = start + params.per_page
    return Page(
        items=items[start:end],
        total=total,
        page=params.page,
        per_page=params.per_page,
        total_pages=total_pages,
        has_next=params.page < total_pages,
        has_prev=params.page > 1,
    )

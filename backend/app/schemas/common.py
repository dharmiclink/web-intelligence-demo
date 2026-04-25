from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    database: str


class QueueSummary(BaseModel):
    name: str
    description: str
    pending: int
    in_review: int
    high_risk: int
    average_age_hours: float


class KPIBlock(BaseModel):
    label: str
    value: str
    delta: str
    tone: str


class ChartPoint(BaseModel):
    label: str
    value: float


class RecentCase(BaseModel):
    id: int
    case_reference: str
    url: str
    category: str
    risk_level: str
    malaysia_targeted: bool
    queue_name: str
    status: str
    submitted_at: datetime
    summary: str


class OverviewResponse(BaseModel):
    kpis: list[KPIBlock]
    category_distribution: list[ChartPoint]
    weekly_scan_trend: list[dict[str, Any]]
    queue_distribution: list[ChartPoint]
    targeting_signals: list[ChartPoint]
    recent_cases: list[RecentCase]
    agency_workload: list[QueueSummary]


class AnalyticsResponse(BaseModel):
    scan_volume: list[dict[str, Any]]
    suspicious_rate: list[dict[str, Any]]
    category_trends: list[dict[str, Any]]
    routing_trends: list[dict[str, Any]]
    reviewer_outcomes: list[ChartPoint]
    outcome_placeholders: list[ChartPoint]
    targeting_patterns: list[ChartPoint]


class URLCreateRequest(BaseModel):
    url: str
    source: str = "manual"
    notes: str | None = None


class BulkURLCreateRequest(BaseModel):
    urls: list[str] = Field(default_factory=list)
    source: str = "bulk-upload"


class ReviewUpdateRequest(BaseModel):
    reviewer_name: str
    review_status: str
    notes: str
    analyst_owner: str | None = None


class DemoSeedRequest(BaseModel):
    count: int = 72
    reset: bool = True


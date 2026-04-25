from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class URLSubmission(Base):
    __tablename__ = "urls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    url: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(64), default="manual")
    status: Mapped[str] = mapped_column(String(32), default="pending")
    submitted_at: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    crawl_result: Mapped["CrawlResult"] = relationship(back_populates="url_submission", uselist=False)
    extracted_features: Mapped["ExtractedFeatures"] = relationship(back_populates="url_submission", uselist=False)
    classification: Mapped["Classification"] = relationship(back_populates="url_submission", uselist=False)
    malaysia_targeting: Mapped["MalaysiaTargeting"] = relationship(back_populates="url_submission", uselist=False)
    case: Mapped["CaseRecord"] = relationship(back_populates="url_submission", uselist=False)


class CrawlResult(Base):
    __tablename__ = "crawl_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url_id: Mapped[int] = mapped_column(ForeignKey("urls.id"), unique=True, nullable=False)
    final_url: Mapped[str] = mapped_column(String(512), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    site_summary: Mapped[str] = mapped_column(Text, nullable=False)
    screenshot_path: Mapped[str] = mapped_column(String(255), nullable=False)
    html_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    crawled_at: Mapped[DateTime] = mapped_column(DateTime, nullable=False)

    url_submission: Mapped["URLSubmission"] = relationship(back_populates="crawl_result")


class ExtractedFeatures(Base):
    __tablename__ = "extracted_features"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url_id: Mapped[int] = mapped_column(ForeignKey("urls.id"), unique=True, nullable=False)
    primary_language: Mapped[str] = mapped_column(String(64), nullable=False)
    malaysia_signals: Mapped[list[str]] = mapped_column(JSON, default=list)
    indicators: Mapped[list[str]] = mapped_column(JSON, default=list)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    extracted_entities: Mapped[list[str]] = mapped_column(JSON, default=list)
    pricing_markers: Mapped[list[str]] = mapped_column(JSON, default=list)

    url_submission: Mapped["URLSubmission"] = relationship(back_populates="extracted_features")


class Classification(Base):
    __tablename__ = "classifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url_id: Mapped[int] = mapped_column(ForeignKey("urls.id"), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    reason_codes: Mapped[list[str]] = mapped_column(JSON, default=list)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)

    url_submission: Mapped["URLSubmission"] = relationship(back_populates="classification")


class MalaysiaTargeting(Base):
    __tablename__ = "malaysia_targeting"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url_id: Mapped[int] = mapped_column(ForeignKey("urls.id"), unique=True, nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    targeted: Mapped[bool] = mapped_column(Boolean, default=False)
    top_signals: Mapped[list[dict]] = mapped_column(JSON, default=list)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)

    url_submission: Mapped["URLSubmission"] = relationship(back_populates="malaysia_targeting")


class QueueDefinition(Base):
    __tablename__ = "queues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    default_sla_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    queue_cases: Mapped[list["CaseRecord"]] = relationship(back_populates="queue")


class CaseRecord(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    url_id: Mapped[int] = mapped_column(ForeignKey("urls.id"), unique=True, nullable=False)
    queue_id: Mapped[int] = mapped_column(ForeignKey("queues.id"), nullable=False)
    case_reference: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    malaysia_targeting_score: Mapped[float] = mapped_column(Float, nullable=False)
    malaysia_targeted: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32), default="new")
    analyst_owner: Mapped[str | None] = mapped_column(String(128), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_bullets: Mapped[list[str]] = mapped_column(JSON, default=list)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    routing_reason: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    timeline: Mapped[list[dict]] = mapped_column(JSON, default=list)
    opened_at: Mapped[DateTime] = mapped_column(DateTime, nullable=False)
    last_updated_at: Mapped[DateTime] = mapped_column(DateTime, nullable=False)

    url_submission: Mapped["URLSubmission"] = relationship(back_populates="case")
    queue: Mapped["QueueDefinition"] = relationship(back_populates="queue_cases")
    reviews: Mapped[list["ReviewEntry"]] = relationship(back_populates="case", order_by="ReviewEntry.created_at")


class ReviewEntry(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id"), nullable=False)
    reviewer_name: Mapped[str] = mapped_column(String(128), nullable=False)
    review_status: Mapped[str] = mapped_column(String(64), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, nullable=False)

    case: Mapped["CaseRecord"] = relationship(back_populates="reviews")


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    snapshot_date: Mapped[DateTime] = mapped_column(DateTime, nullable=False, index=True)
    scan_volume: Mapped[int] = mapped_column(Integer, nullable=False)
    suspicious_count: Mapped[int] = mapped_column(Integer, nullable=False)
    targeted_count: Mapped[int] = mapped_column(Integer, nullable=False)
    high_risk_count: Mapped[int] = mapped_column(Integer, nullable=False)
    category_distribution: Mapped[dict] = mapped_column(JSON, default=dict)
    queue_distribution: Mapped[dict] = mapped_column(JSON, default=dict)
    targeting_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)


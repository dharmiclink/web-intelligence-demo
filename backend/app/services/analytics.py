from __future__ import annotations

from collections import Counter
from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models import AnalyticsSnapshot, CaseRecord, QueueDefinition, URLSubmission


def build_overview(db: Session) -> dict:
    cases = (
        db.query(CaseRecord)
        .options(joinedload(CaseRecord.queue), joinedload(CaseRecord.url_submission))
        .order_by(CaseRecord.opened_at.desc())
        .all()
    )
    queues = db.query(QueueDefinition).options(joinedload(QueueDefinition.queue_cases)).all()
    snapshots = db.query(AnalyticsSnapshot).order_by(AnalyticsSnapshot.snapshot_date.asc()).all()
    submissions = db.query(URLSubmission).all()

    suspicious_count = sum(1 for case in cases if case.category != "General commerce / benign")
    targeted_count = sum(1 for case in cases if case.malaysia_targeted)
    high_risk_count = sum(1 for case in cases if case.risk_level == "High")
    avg_review_hours = _calculate_average_review_hours(cases)

    category_distribution = Counter(case.category for case in cases)
    queue_distribution = Counter(case.queue.name for case in cases)
    signal_distribution = Counter()
    for case in cases:
        for item in case.evidence_bullets:
            if "Malaysia-targeting score" in item:
                signal_distribution["Malaysia-targeting score"] += 1
            if "Top targeting evidence" in item:
                signal_distribution["Evidence summary present"] += 1
    if snapshots:
        last_snapshot = snapshots[-1]
        for signal, value in last_snapshot.targeting_breakdown.items():
            signal_distribution[signal] += value

    recent_cases = [
        {
            "id": case.id,
            "case_reference": case.case_reference,
            "url": case.url_submission.url,
            "category": case.category,
            "risk_level": case.risk_level,
            "malaysia_targeted": case.malaysia_targeted,
            "queue_name": case.queue.name,
            "status": case.status,
            "submitted_at": case.url_submission.submitted_at,
            "summary": case.summary,
        }
        for case in cases[:8]
    ]

    return {
        "kpis": [
            {"label": "URLs Scanned", "value": f"{len(submissions):,}", "delta": "+12% week on week", "tone": "neutral"},
            {"label": "Suspicious Sites Detected", "value": f"{suspicious_count:,}", "delta": "Rules-led triage active", "tone": "alert"},
            {"label": "Malaysia-Targeted Sites Detected", "value": f"{targeted_count:,}", "delta": "Transparent market scoring", "tone": "positive"},
            {"label": "High-Risk Cases", "value": f"{high_risk_count:,}", "delta": "Executive review priority", "tone": "alert"},
            {"label": "Average Analyst Review Time", "value": f"{avg_review_hours:.1f} hrs", "delta": "POC operating baseline", "tone": "neutral"},
        ],
        "category_distribution": [{"label": key, "value": value} for key, value in category_distribution.items()],
        "weekly_scan_trend": [
            {
                "label": snapshot.snapshot_date.strftime("%d %b"),
                "scan_volume": snapshot.scan_volume,
                "suspicious_count": snapshot.suspicious_count,
                "targeted_count": snapshot.targeted_count,
            }
            for snapshot in snapshots[-7:]
        ],
        "queue_distribution": [{"label": key, "value": value} for key, value in queue_distribution.items()],
        "targeting_signals": [{"label": key, "value": value} for key, value in signal_distribution.most_common(5)],
        "recent_cases": recent_cases,
        "agency_workload": [_queue_summary(queue) for queue in queues],
    }


def build_analytics(db: Session) -> dict:
    snapshots = db.query(AnalyticsSnapshot).order_by(AnalyticsSnapshot.snapshot_date.asc()).all()
    cases = db.query(CaseRecord).options(joinedload(CaseRecord.queue), joinedload(CaseRecord.reviews)).all()

    scan_volume = [
        {
            "label": snapshot.snapshot_date.strftime("%d %b"),
            "scanned": snapshot.scan_volume,
            "targeted": snapshot.targeted_count,
        }
        for snapshot in snapshots
    ]
    suspicious_rate = [
        {
            "label": snapshot.snapshot_date.strftime("%d %b"),
            "rate": round((snapshot.suspicious_count / snapshot.scan_volume) * 100, 1),
        }
        for snapshot in snapshots
    ]
    category_trends = [
        {
            "label": snapshot.snapshot_date.strftime("%d %b"),
            "pharmacy": snapshot.category_distribution.get("Illegal or suspicious pharmacy", 0),
            "gambling": snapshot.category_distribution.get("Gambling", 0),
            "adult": snapshot.category_distribution.get("Adult content", 0),
            "commerce": snapshot.category_distribution.get("General commerce / benign", 0),
            "unknown": snapshot.category_distribution.get("Unknown / needs review", 0),
        }
        for snapshot in snapshots[-12:]
    ]
    routing_trends = [
        {
            "label": snapshot.snapshot_date.strftime("%d %b"),
            "health": snapshot.queue_distribution.get("Ministry of Health review queue", 0),
            "customs": snapshot.queue_distribution.get("Customs review queue", 0),
            "police": snapshot.queue_distribution.get("Police review queue", 0),
            "mcmc": snapshot.queue_distribution.get("MCMC review queue", 0),
        }
        for snapshot in snapshots[-12:]
    ]

    reviewer_outcomes = Counter(review.review_status for case in cases for review in case.reviews)
    outcome_placeholders = Counter(
        {
            "Confirmed": max(1, len(cases) // 3),
            "False Positive": max(1, len(cases) // 10),
            "Needs More Evidence": max(1, len(cases) // 6),
        }
    )
    targeting_patterns = Counter()
    for snapshot in snapshots[-1:]:
        targeting_patterns.update(snapshot.targeting_breakdown)

    return {
        "scan_volume": scan_volume,
        "suspicious_rate": suspicious_rate,
        "category_trends": category_trends,
        "routing_trends": routing_trends,
        "reviewer_outcomes": [{"label": key, "value": value} for key, value in reviewer_outcomes.items()],
        "outcome_placeholders": [{"label": key, "value": value} for key, value in outcome_placeholders.items()],
        "targeting_patterns": [{"label": key, "value": value} for key, value in targeting_patterns.items()],
    }


def _queue_summary(queue: QueueDefinition) -> dict:
    now = datetime.now()
    cases = queue.queue_cases
    return {
        "name": queue.name,
        "description": queue.description,
        "pending": sum(1 for case in cases if case.status in {"new", "pending-review"}),
        "in_review": sum(1 for case in cases if case.status == "in-review"),
        "high_risk": sum(1 for case in cases if case.risk_level == "High"),
        "average_age_hours": round(sum((now - case.opened_at).total_seconds() / 3600 for case in cases) / max(len(cases), 1), 1),
    }


def _calculate_average_review_hours(cases: list[CaseRecord]) -> float:
    durations = []
    for case in cases:
        if case.reviews:
            durations.append((case.reviews[0].created_at - case.opened_at).total_seconds() / 3600)
    return round(sum(durations) / max(len(durations), 1), 1)

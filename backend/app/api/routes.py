from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import CaseRecord, Classification, CrawlResult, ExtractedFeatures, MalaysiaTargeting, QueueDefinition, ReviewEntry, URLSubmission
from app.schemas.common import BulkURLCreateRequest, DemoSeedRequest, HealthResponse, ReviewUpdateRequest, URLCreateRequest
from app.services.analysis import (
    analyse_category,
    analyse_malaysia_targeting,
    assign_queue,
    build_routing_policy,
    build_targeting_model,
    derive_final_url,
    extract_keywords,
)
from app.services.analytics import build_analytics, build_overview
from app.services.demo_data import seed_demo_data


router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", database="sqlite")


@router.get("/stats/overview")
def stats_overview(db: Session = Depends(get_db)):
    return build_overview(db)


@router.get("/stats/analytics")
def stats_analytics(db: Session = Depends(get_db)):
    return build_analytics(db)


@router.get("/urls")
def list_urls(limit: int = Query(default=20, le=100), db: Session = Depends(get_db)):
    submissions = db.query(URLSubmission).order_by(URLSubmission.submitted_at.desc()).limit(limit).all()
    return [
        {
            "id": item.id,
            "url": item.url,
            "source": item.source,
            "status": item.status,
            "submitted_at": item.submitted_at,
        }
        for item in submissions
    ]


@router.post("/urls")
def create_url(payload: URLCreateRequest, db: Session = Depends(get_db)):
    submission = URLSubmission(
        url=payload.url,
        source=payload.source,
        status="pending",
        submitted_at=datetime.now(),
        notes=payload.notes,
    )
    db.add(submission)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(URLSubmission).filter(URLSubmission.url == payload.url).first()
        if not existing:
            raise HTTPException(status_code=409, detail="Duplicate URL submission")
        return {
            "id": existing.id,
            "url": existing.url,
            "status": existing.status,
            "source": existing.source,
            "submitted_at": existing.submitted_at,
        }
    db.refresh(submission)
    return {
        "id": submission.id,
        "url": submission.url,
        "status": submission.status,
        "source": submission.source,
        "submitted_at": submission.submitted_at,
    }


@router.post("/urls/bulk")
def create_urls_bulk(payload: BulkURLCreateRequest, db: Session = Depends(get_db)):
    created_ids = []
    timestamp = datetime.now()
    for url in payload.urls:
        if db.query(URLSubmission).filter(URLSubmission.url == url).first():
            continue
        submission = URLSubmission(url=url, source=payload.source, status="pending", submitted_at=timestamp)
        db.add(submission)
        db.flush()
        created_ids.append(submission.id)
    db.commit()
    return {"created": len(created_ids), "ids": created_ids}


@router.post("/analyze/{submission_id}")
def analyze_submission(submission_id: int, db: Session = Depends(get_db)):
    submission = db.query(URLSubmission).filter(URLSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.case:
        return {"message": "Already analyzed", "case_id": submission.case.id}

    content = (
        f"{submission.url} Promotional site with MYR pricing and Kuala Lumpur contact details. "
        "This is mock/demo logic for presentation use only."
    )
    category = analyse_category(submission.url, content)
    targeting = analyse_malaysia_targeting(content)
    queue_name = assign_queue(category.category, targeting.targeted)
    queue = db.query(QueueDefinition).filter(QueueDefinition.name == queue_name).first()
    if not queue:
        queue = QueueDefinition(name=queue_name, description="Auto-created queue for demo", default_sla_hours=16)
        db.add(queue)
        db.flush()

    submission.status = "completed"
    db.add(
        CrawlResult(
            url_id=submission.id,
            final_url=derive_final_url(submission.url),
            title="Newly Analysed Submission",
            site_summary=content,
            screenshot_path="/assets/screenshots/case-001.svg",
            html_excerpt=content,
            crawled_at=datetime.now(),
        )
    )
    db.add(
        ExtractedFeatures(
            url_id=submission.id,
            primary_language="Malay / English mixed",
            malaysia_signals=[signal["label"] for signal in targeting.top_signals],
            indicators=category.reason_codes,
            keywords=extract_keywords(content),
            extracted_entities=["MYR", "Kuala Lumpur", "+60"],
            pricing_markers=["MYR"],
        )
    )
    db.add(
        Classification(
            url_id=submission.id,
            category=category.category,
            confidence=category.confidence,
            risk_level=category.risk_level,
            reason_codes=category.reason_codes,
            needs_review=category.needs_review,
            explanation=category.explanation,
        )
    )
    db.add(
        MalaysiaTargeting(
            url_id=submission.id,
            score=targeting.score,
            targeted=targeting.targeted,
            top_signals=targeting.top_signals,
            explanation=targeting.explanation,
        )
    )
    case = CaseRecord(
        url_id=submission.id,
        queue_id=queue.id,
        case_reference=f"MY-WIP-{submission.id:04d}",
        category=category.category,
        confidence=category.confidence,
        risk_level=category.risk_level,
        malaysia_targeting_score=targeting.score,
        malaysia_targeted=targeting.targeted,
        status="new",
        analyst_owner=None,
        summary="New submission analysed through the mock pipeline.",
        evidence_bullets=[
            f"Classification reason codes: {', '.join(category.reason_codes[:2])}",
            f"Target-market score: {targeting.score}",
        ],
        reasoning="Mock rule evaluation completed.",
        routing_reason=f"Routed to {queue_name}.",
        recommended_action="Decision-support only. Analyst validation required.",
        timeline=[
            {"stage": "URL intake", "status": "completed", "time": datetime.now().isoformat(), "detail": "Submission received."},
            {"stage": "Routing", "status": "completed", "time": datetime.now().isoformat(), "detail": f"Assigned to {queue_name}."},
        ],
        opened_at=datetime.now(),
        last_updated_at=datetime.now(),
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return {"message": "Analysis completed", "case_id": case.id}


@router.get("/cases")
def list_cases(
    queue: str | None = None,
    category: str | None = None,
    status: str | None = None,
    query: str | None = None,
    limit: int = Query(default=100, le=200),
    db: Session = Depends(get_db),
):
    result = (
        db.query(CaseRecord)
        .options(
            joinedload(CaseRecord.queue),
            joinedload(CaseRecord.url_submission),
            joinedload(CaseRecord.reviews),
        )
        .order_by(CaseRecord.opened_at.desc())
    )
    if queue:
        result = result.join(CaseRecord.queue).filter(QueueDefinition.name == queue)
    if category:
        result = result.filter(CaseRecord.category == category)
    if status:
        result = result.filter(CaseRecord.status == status)
    if query:
        like = f"%{query.lower()}%"
        result = result.join(CaseRecord.url_submission).filter(URLSubmission.url.ilike(like))
    cases = result.limit(limit).all()
    return [_case_payload(case) for case in cases]


@router.get("/cases/{case_id}")
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = (
        db.query(CaseRecord)
        .options(
            joinedload(CaseRecord.queue),
            joinedload(CaseRecord.url_submission)
            .joinedload(URLSubmission.crawl_result),
            joinedload(CaseRecord.url_submission)
            .joinedload(URLSubmission.extracted_features),
            joinedload(CaseRecord.url_submission)
            .joinedload(URLSubmission.classification),
            joinedload(CaseRecord.url_submission)
            .joinedload(URLSubmission.malaysia_targeting),
            joinedload(CaseRecord.reviews),
        )
        .filter(CaseRecord.id == case_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return _case_payload(case, detailed=True)


@router.patch("/cases/{case_id}/review")
def update_review(case_id: int, payload: ReviewUpdateRequest, db: Session = Depends(get_db)):
    case = db.query(CaseRecord).filter(CaseRecord.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if payload.analyst_owner:
        case.analyst_owner = payload.analyst_owner
    case.status = payload.review_status
    case.last_updated_at = datetime.now()
    review = ReviewEntry(
        case_id=case.id,
        reviewer_name=payload.reviewer_name,
        review_status=payload.review_status,
        notes=payload.notes,
        created_at=datetime.now(),
    )
    db.add(review)
    db.commit()
    return {"message": "Review updated"}


@router.get("/queues")
def list_queues(db: Session = Depends(get_db)):
    queues = db.query(QueueDefinition).options(joinedload(QueueDefinition.queue_cases)).all()
    return [
        {
            "name": queue.name,
            "description": queue.description,
            "default_sla_hours": queue.default_sla_hours,
            "case_count": len(queue.queue_cases),
            "high_risk_count": sum(1 for case in queue.queue_cases if case.risk_level == "High"),
        }
        for queue in queues
    ]


@router.get("/queues/{queue_name}")
def get_queue(queue_name: str, db: Session = Depends(get_db)):
    queue = (
        db.query(QueueDefinition)
        .options(joinedload(QueueDefinition.queue_cases).joinedload(CaseRecord.url_submission))
        .filter(QueueDefinition.name == queue_name)
        .first()
    )
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    return {
        "name": queue.name,
        "description": queue.description,
        "default_sla_hours": queue.default_sla_hours,
        "cases": [_case_payload(case) for case in sorted(queue.queue_cases, key=lambda item: item.opened_at, reverse=True)],
    }


@router.post("/demo/seed")
def seed_demo(payload: DemoSeedRequest, db: Session = Depends(get_db)):
    return seed_demo_data(db, count=payload.count, reset=payload.reset)


def _case_payload(case: CaseRecord, detailed: bool = False) -> dict:
    payload = {
        "id": case.id,
        "case_reference": case.case_reference,
        "url": case.url_submission.url,
        "submitted_at": case.url_submission.submitted_at,
        "category": case.category,
        "confidence": case.confidence,
        "risk_level": case.risk_level,
        "malaysia_targeting_score": case.malaysia_targeting_score,
        "malaysia_targeted": case.malaysia_targeted,
        "queue_name": case.queue.name,
        "status": case.status,
        "analyst_owner": case.analyst_owner,
        "summary": case.summary,
        "evidence_bullets": case.evidence_bullets,
        "reasoning": case.reasoning,
    }
    if detailed:
        payload.update(
            {
                "final_url": case.url_submission.crawl_result.final_url,
                "title": case.url_submission.crawl_result.title,
                "screenshot_url": case.url_submission.crawl_result.screenshot_path,
                "site_summary": case.url_submission.crawl_result.site_summary,
                "html_excerpt": case.url_submission.crawl_result.html_excerpt,
                "classification": {
                    "category": case.url_submission.classification.category,
                    "confidence": case.url_submission.classification.confidence,
                    "risk_level": case.url_submission.classification.risk_level,
                    "reason_codes": case.url_submission.classification.reason_codes,
                    "needs_review": case.url_submission.classification.needs_review,
                    "explanation": case.url_submission.classification.explanation,
                },
                "malaysia_targeting": {
                    "score": case.url_submission.malaysia_targeting.score,
                    "targeted": case.url_submission.malaysia_targeting.targeted,
                    "top_signals": case.url_submission.malaysia_targeting.top_signals,
                    "explanation": case.url_submission.malaysia_targeting.explanation,
                },
                "targeting_model": build_targeting_model(
                    case.url_submission.malaysia_targeting.score,
                    case.url_submission.malaysia_targeting.targeted,
                    case.url_submission.malaysia_targeting.top_signals,
                ),
                "features": {
                    "primary_language": case.url_submission.extracted_features.primary_language,
                    "malaysia_signals": case.url_submission.extracted_features.malaysia_signals,
                    "indicators": case.url_submission.extracted_features.indicators,
                    "keywords": case.url_submission.extracted_features.keywords,
                    "extracted_entities": case.url_submission.extracted_features.extracted_entities,
                    "pricing_markers": case.url_submission.extracted_features.pricing_markers,
                },
                "timeline": case.timeline,
                "routing_reason": case.routing_reason,
                "routing_policy": build_routing_policy(
                    case.category,
                    case.malaysia_targeted,
                    case.queue.name,
                    case.risk_level,
                    case.confidence,
                ),
                "recommended_action": case.recommended_action,
                "reviews": [
                    {
                        "reviewer_name": review.reviewer_name,
                        "review_status": review.review_status,
                        "notes": review.notes,
                        "created_at": review.created_at,
                    }
                    for review in case.reviews
                ],
            }
        )
    return payload

from __future__ import annotations

import random
from collections import Counter
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import SCREENSHOT_DIR
from app.models import (
    AnalyticsSnapshot,
    CaseRecord,
    Classification,
    CrawlResult,
    ExtractedFeatures,
    MalaysiaTargeting,
    QueueDefinition,
    ReviewEntry,
    URLSubmission,
)
from app.services.analysis import analyse_category, analyse_malaysia_targeting, assign_queue, derive_final_url, extract_keywords


QUEUE_DEFINITIONS = [
    ("Ministry of Health review queue", "Screens cases involving medicines, supplements, and potentially unsafe pharmacy marketing.", 12),
    ("Customs review queue", "Screens cross-border commerce signals, shipping flows, and commercial declaration relevance.", 24),
    ("Police review queue", "Handles high-severity public order and gambling-related referrals within the demo.", 8),
    ("MCMC review queue", "Reviews content governance, communications risks, and cases requiring cross-agency assessment.", 16),
]

SITE_BLUEPRINTS = [
    {
        "name": "rx-express-market",
        "category_hint": "Illegal or suspicious pharmacy",
        "title": "Express Wellness Pharmacy",
        "content": "Buy prescription pill packs online. Harga RM189 with penghantaran Malaysia and WhatsApp +60 11-2334 7788 from Kuala Lumpur.",
        "market_copy": "Direct-to-consumer medicine promotion with rapid checkout claims and limited compliance disclosures.",
        "recommended_action": "Escalate to Ministry of Health review for product legitimacy, labeling, and import-control assessment.",
    },
    {
        "name": "slot-nusantara",
        "category_hint": "Gambling",
        "title": "Nusantara Bet Exchange",
        "content": "Sportsbook jackpot offers for Malaysian customers. Deposit in MYR, call +60 3-2277 9900. Trusted by Malaysia market operators.",
        "market_copy": "Consumer-facing betting interface with domestic payment language and repeated jackpot acquisition prompts.",
        "recommended_action": "Route to Police review queue for validation of gambling indicators and any downstream inter-agency coordination.",
    },
    {
        "name": "private-velvet-directory",
        "category_hint": "Adult content",
        "title": "Private Velvet Gallery",
        "content": "Adult private gallery with Kuala Lumpur listings, RM pricing, and discreet customer support for local members.",
        "market_copy": "Age-restricted promotional copy with localised membership language and monetised access framing.",
        "recommended_action": "Route to MCMC review queue for communications-content assessment and policy validation.",
    },
    {
        "name": "borneo-harvest-store",
        "category_hint": "General commerce / benign",
        "title": "Borneo Harvest Commerce",
        "content": "Official catalog for local crafts with MYR checkout, delivery across West Malaysia and East Malaysia, and Johor warehouse notice.",
        "market_copy": "Conventional cross-border commerce presentation with local shipping statements and declared logistics partners.",
        "recommended_action": "Route to Customs review queue for routine triage where commercial declarations or import checks are relevant.",
    },
    {
        "name": "opaque-market-index",
        "category_hint": "Unknown / needs review",
        "title": "Opaque Market Index",
        "content": "Promotional portal with mixed offers, limited disclosures, and fragmented consumer language. Manual review is recommended.",
        "market_copy": "Ambiguous marketplace framing with mixed claims and weak trust or ownership disclosures.",
        "recommended_action": "Route to MCMC review queue for first-pass assessment because automated evidence is incomplete.",
    },
]

STATUS_OPTIONS = ["new", "pending-review", "in-review", "escalation-placeholder", "closed"]
ANALYSTS = ["Nur Aina", "Hakim Iskandar", "Siti Farrah", "Daniel Ong", "Review Pending"]
REVIEW_NOTES = [
    "Automated evidence pack prepared for analyst validation and queue briefing.",
    "Signals indicate Malaysia market positioning; ownership and payment-path verification remain manual.",
    "Routing confidence is acceptable for proposal triage, but no agency action is automated.",
    "Placeholder escalation logic only. Any onward action would require policy and analyst confirmation.",
]
LOCATION_VARIANTS = [
    ("Kuala Lumpur", "03-2299 1140", "central corridor consumer targeting"),
    ("Johor Bahru", "07-553 2102", "southern gateway commerce references"),
    ("Penang", "04-331 8870", "northern peninsula logistics mentions"),
    ("Shah Alam", "03-5569 7702", "Selangor fulfilment references"),
]


def seed_demo_data(db: Session, count: int = 72, reset: bool = False) -> dict:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    if reset:
        for table in reversed(AnalyticsSnapshot.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()

    existing = db.query(URLSubmission).count()
    if existing and not reset:
        return {"message": "Demo data already present", "count": existing}

    queue_map = {}
    for name, description, sla in QUEUE_DEFINITIONS:
        queue = QueueDefinition(name=name, description=description, default_sla_hours=sla)
        db.add(queue)
        db.flush()
        queue_map[name] = queue

    now = datetime.now()
    created_cases: list[CaseRecord] = []
    random.seed(42)

    for index in range(count):
        blueprint = SITE_BLUEPRINTS[index % len(SITE_BLUEPRINTS)]
        city, landline, locality_note = LOCATION_VARIANTS[index % len(LOCATION_VARIANTS)]
        day_offset = random.randint(0, 27)
        minute_offset = random.randint(0, 720)
        submitted_at = now - timedelta(days=day_offset, minutes=minute_offset)
        url = f"https://{blueprint['name']}-{index + 1:03d}.example"
        domain_copy = blueprint["content"]
        content = (
            f"{domain_copy} {blueprint['market_copy']} Campaign reference {index + 1:03d}. "
            f"Local contact desk {landline} and {city} fulfilment note. "
            f"Signal posture: {locality_note}. "
            f"{random.choice(['Fast response', 'Consumer referral', 'Market outreach', 'Cross-channel promotion'])}."
        )
        category_result = analyse_category(url, content)
        targeting_result = analyse_malaysia_targeting(content)
        queue_name = assign_queue(category_result.category, targeting_result.targeted)
        queue = queue_map[queue_name]
        screenshot_name = f"case-{index + 1:03d}.svg"

        submission = URLSubmission(
            url=url,
            source="seeded-demo",
            status="completed",
            submitted_at=submitted_at,
            notes="Seeded proposal data",
        )
        db.add(submission)
        db.flush()

        _write_screenshot(index + 1, screenshot_name, blueprint["title"], category_result.category, targeting_result.score)

        db.add(
            CrawlResult(
                url_id=submission.id,
                final_url=derive_final_url(url),
                title=blueprint["title"],
                site_summary=content,
                screenshot_path=f"/assets/screenshots/{screenshot_name}",
                html_excerpt=content,
                crawled_at=submitted_at + timedelta(minutes=2),
            )
        )
        db.add(
            ExtractedFeatures(
                url_id=submission.id,
                primary_language="Malay / English mixed" if targeting_result.targeted else "English",
                malaysia_signals=[signal["label"] for signal in targeting_result.top_signals],
                indicators=category_result.reason_codes,
                keywords=extract_keywords(content),
                extracted_entities=[
                    marker
                    for marker in ["MYR", city, "+60", "West Malaysia", "Johor", "Penang", "Shah Alam"]
                    if marker.lower() in content.lower()
                ],
                pricing_markers=["MYR", "RM189"] if "rm" in content.lower() else [],
            )
        )
        db.add(
            Classification(
                url_id=submission.id,
                category=category_result.category,
                confidence=category_result.confidence,
                risk_level=category_result.risk_level,
                reason_codes=category_result.reason_codes,
                needs_review=category_result.needs_review,
                explanation=category_result.explanation,
            )
        )
        db.add(
            MalaysiaTargeting(
                url_id=submission.id,
                score=targeting_result.score,
                targeted=targeting_result.targeted,
                top_signals=targeting_result.top_signals,
                explanation=targeting_result.explanation,
            )
        )

        evidence = [
            f"Detected category indicators: {', '.join(category_result.reason_codes[:2])}",
            f"Malaysia-targeting score: {targeting_result.score}/100 against a 35-point threshold",
            f"Top targeting evidence: {', '.join(signal['label'] for signal in targeting_result.top_signals[:3]) or 'limited signal coverage'}",
            f"Observed market references include {city}, {landline}, and direct Malaysia-facing copy.",
        ]
        timeline = [
            {"stage": "URL intake", "status": "completed", "time": submitted_at.isoformat(), "detail": "Submission accepted into the proposal workflow."},
            {"stage": "Crawl", "status": "completed", "time": (submitted_at + timedelta(minutes=2)).isoformat(), "detail": "Landing page metadata, placeholder screenshot, and declared contact details captured."},
            {"stage": "Feature extraction", "status": "completed", "time": (submitted_at + timedelta(minutes=4)).isoformat(), "detail": f"Language, pricing, address, keyword, and locality indicators extracted for {city} context."},
            {"stage": "Classification", "status": "completed", "time": (submitted_at + timedelta(minutes=5)).isoformat(), "detail": category_result.explanation},
            {"stage": "Malaysia targeting", "status": "completed", "time": (submitted_at + timedelta(minutes=6)).isoformat(), "detail": targeting_result.explanation},
            {"stage": "Case generation", "status": "completed", "time": (submitted_at + timedelta(minutes=7)).isoformat(), "detail": "Executive summary, evidence bullets, and policy-facing narrative prepared for analyst review."},
            {"stage": "Routing", "status": "completed", "time": (submitted_at + timedelta(minutes=8)).isoformat(), "detail": f"Assigned to {queue_name} with advisory policy logic only."},
        ]
        case = CaseRecord(
            url_id=submission.id,
            queue_id=queue.id,
            case_reference=f"MY-WIP-{index + 1:04d}",
            category=category_result.category,
            confidence=category_result.confidence,
            risk_level=category_result.risk_level,
            malaysia_targeting_score=targeting_result.score,
            malaysia_targeted=targeting_result.targeted,
            status=STATUS_OPTIONS[index % len(STATUS_OPTIONS)],
            analyst_owner=None if index % 5 == 0 else ANALYSTS[index % (len(ANALYSTS) - 1)],
            summary=_build_summary(category_result.category, targeting_result.targeted, queue_name, city),
            evidence_bullets=evidence,
            reasoning=(
                f"The case demonstrates explainable scoring with confidence {category_result.confidence:.2f}, "
                f"Malaysia-targeting score {targeting_result.score:.1f}, and market references tied to {city}. "
                f"Automated outputs are advisory only and intended for analyst triage."
            ),
            routing_reason=(
                f"Category policy, Malaysia-targeting evidence, and {category_result.risk_level.lower()}-risk posture "
                f"collectively mapped this case to {queue_name}."
            ),
            recommended_action=blueprint["recommended_action"],
            timeline=timeline,
            opened_at=submitted_at + timedelta(minutes=7),
            last_updated_at=submitted_at + timedelta(minutes=8),
        )
        db.add(case)
        db.flush()
        created_cases.append(case)

        review_count = 1 if index % 3 else 2
        for review_index in range(review_count):
            db.add(
                ReviewEntry(
                    case_id=case.id,
                    reviewer_name=ANALYSTS[(index + review_index) % (len(ANALYSTS) - 1)],
                    review_status=["triaged", "validated", "awaiting-agency", "closed"][review_index % 4],
                    notes=f"{REVIEW_NOTES[(index + review_index) % len(REVIEW_NOTES)]} Case context references {city}.",
                    created_at=submitted_at + timedelta(minutes=15 + review_index * 35),
                )
            )

    snapshots = _build_snapshots(created_cases, now)
    for snapshot in snapshots:
        db.add(snapshot)

    db.commit()
    return {"message": "Demo data seeded", "count": count}


def _build_summary(category: str, malaysia_targeted: bool, queue_name: str, city: str) -> str:
    targeting_copy = "shows Malaysia-targeting indicators" if malaysia_targeted else "shows limited Malaysia-targeting indicators"
    return (
        f"Automated assessment indicates the site aligns with {category.lower()}, {targeting_copy}, "
        f"and references {city}. Case routed to {queue_name} for structured review."
    )


def _write_screenshot(index: int, filename: str, title: str, category: str, score: float) -> None:
    category_color = {
        "Illegal or suspicious pharmacy": "#A53E32",
        "Gambling": "#8F4B12",
        "Adult content": "#7C4D8D",
        "General commerce / benign": "#1F6A62",
        "Unknown / needs review": "#3F5069",
    }[category]
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#F8FBFD" />
    <stop offset="100%" stop-color="#E8EEF5" />
  </linearGradient>
</defs>
<rect width="1280" height="720" fill="url(#bg)" />
<rect x="64" y="56" width="1152" height="608" rx="28" fill="#FFFFFF" stroke="#D7E0EA" />
<rect x="64" y="56" width="1152" height="84" rx="28" fill="#0D2742" />
<circle cx="116" cy="98" r="8" fill="#F5B23D" />
<circle cx="144" cy="98" r="8" fill="#E56B5A" />
<circle cx="172" cy="98" r="8" fill="#7FC6A4" />
<text x="212" y="106" font-family="Arial, sans-serif" font-size="24" fill="#EAF2F8">Proposal Capture {index:03d}</text>
<rect x="112" y="184" width="468" height="252" rx="24" fill="#F4F8FB" stroke="#DCE6F0" />
<rect x="632" y="184" width="472" height="72" rx="18" fill="{category_color}" opacity="0.12" />
<text x="664" y="228" font-family="Arial, sans-serif" font-size="32" fill="#0F253D">{title}</text>
<text x="664" y="286" font-family="Arial, sans-serif" font-size="22" fill="#506173">Category: {category}</text>
<text x="664" y="326" font-family="Arial, sans-serif" font-size="22" fill="#506173">Malaysia-targeting score: {score:.0f}/100</text>
<text x="664" y="366" font-family="Arial, sans-serif" font-size="22" fill="#506173">Executive-grade placeholder capture for proposal walkthroughs</text>
<rect x="112" y="468" width="992" height="116" rx="24" fill="#0F253D" />
<text x="152" y="528" font-family="Arial, sans-serif" font-size="28" fill="#FFFFFF">Demonstration screenshot placeholder</text>
<text x="152" y="566" font-family="Arial, sans-serif" font-size="20" fill="#BFD0E0">No live crawl is performed in the seeded demo. Visuals are synthetic for presentation use.</text>
</svg>"""
    (SCREENSHOT_DIR / filename).write_text(svg, encoding="utf-8")


def _build_snapshots(cases: list[CaseRecord], now: datetime) -> list[AnalyticsSnapshot]:
    snapshots: list[AnalyticsSnapshot] = []
    for offset in range(28):
        date = (now - timedelta(days=27 - offset)).replace(hour=0, minute=0, second=0, microsecond=0)
        sample = [case for case in cases if case.opened_at.date() <= date.date()]
        scan_volume = 40 + offset * 2
        suspicious_count = max(12, int(scan_volume * 0.48))
        targeted_count = max(8, int(suspicious_count * 0.65))
        high_risk_count = max(4, int(suspicious_count * 0.34))
        categories = Counter(case.category for case in sample[-40:])
        queues = Counter(case.queue.name for case in sample[-40:])
        targeting_breakdown = {
            "MYR pricing": 14 + offset,
            "Malay language usage": 10 + offset // 2,
            "Malaysia shipping references": 8 + offset // 3,
            "Malaysian phone numbers": 6 + offset // 4,
        }
        snapshots.append(
            AnalyticsSnapshot(
                snapshot_date=date,
                scan_volume=scan_volume,
                suspicious_count=suspicious_count,
                targeted_count=targeted_count,
                high_risk_count=high_risk_count,
                category_distribution=dict(categories),
                queue_distribution=dict(queues),
                targeting_breakdown=targeting_breakdown,
            )
        )
    return snapshots

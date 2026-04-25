from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import joinedload


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.api.routes import _case_payload  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models import CaseRecord, QueueDefinition, URLSubmission  # noqa: E402
from app.services.analytics import build_analytics, build_overview  # noqa: E402
from app.services.demo_data import seed_demo_data  # noqa: E402


PUBLIC_DIR = ROOT / "frontend" / "public"
DEMO_DIR = PUBLIC_DIR / "demo"
DEMO_BUNDLE_PATH = DEMO_DIR / "demo-bundle.json"
SCREENSHOT_SOURCE_DIR = ROOT / "data" / "assets" / "screenshots"
SCREENSHOT_TARGET_DIR = PUBLIC_DIR / "assets" / "screenshots"


def _serialize(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    return value


def main() -> None:
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOT_TARGET_DIR.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        seed_demo_data(db, count=72, reset=False)

        cases = (
            db.query(CaseRecord)
            .options(
                joinedload(CaseRecord.queue),
                joinedload(CaseRecord.url_submission).joinedload(URLSubmission.crawl_result),
                joinedload(CaseRecord.url_submission).joinedload(URLSubmission.extracted_features),
                joinedload(CaseRecord.url_submission).joinedload(URLSubmission.classification),
                joinedload(CaseRecord.url_submission).joinedload(URLSubmission.malaysia_targeting),
                joinedload(CaseRecord.reviews),
            )
            .order_by(CaseRecord.opened_at.desc())
            .all()
        )
        queues = db.query(QueueDefinition).options(joinedload(QueueDefinition.queue_cases)).all()
        urls = db.query(URLSubmission).order_by(URLSubmission.submitted_at.desc()).all()

        queue_list = [
            {
                "name": queue.name,
                "description": queue.description,
                "default_sla_hours": queue.default_sla_hours,
                "case_count": len(queue.queue_cases),
                "high_risk_count": sum(1 for case in queue.queue_cases if case.risk_level == "High"),
            }
            for queue in queues
        ]

        queue_details = {
            queue.name: {
                "name": queue.name,
                "description": queue.description,
                "default_sla_hours": queue.default_sla_hours,
                "cases": [
                    _case_payload(case)
                    for case in sorted(queue.queue_cases, key=lambda item: item.opened_at, reverse=True)
                ],
            }
            for queue in queues
        }

        bundle = {
            "generated_at": datetime.now(),
            "overview": build_overview(db),
            "analytics": build_analytics(db),
            "cases": [_case_payload(case) for case in cases],
            "caseDetails": {str(case.id): _case_payload(case, detailed=True) for case in cases},
            "queues": queue_list,
            "queueDetails": queue_details,
            "urls": [
                {
                    "id": item.id,
                    "url": item.url,
                    "source": item.source,
                    "status": item.status,
                    "submitted_at": item.submitted_at,
                }
                for item in urls
            ],
        }

        DEMO_BUNDLE_PATH.write_text(json.dumps(_serialize(bundle), indent=2), encoding="utf-8")

        for screenshot in SCREENSHOT_SOURCE_DIR.glob("*.svg"):
            shutil.copy2(screenshot, SCREENSHOT_TARGET_DIR / screenshot.name)
    finally:
        db.close()


if __name__ == "__main__":
    main()

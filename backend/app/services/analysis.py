from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urlparse


CATEGORY_RULES = {
    "Illegal or suspicious pharmacy": {
        "keywords": ["pharmacy", "pill", "levitra", "cialis", "rx", "prescription", "ubat", "klinik"],
        "reason_codes": ["PHARMACY_KEYWORDS", "MEDICAL_PRODUCT_MARKERS"],
    },
    "Gambling": {
        "keywords": ["casino", "bet", "slot", "sportsbook", "jackpot", "poker", "wager", "4d"],
        "reason_codes": ["GAMBLING_TERMS", "BETTING_MARKET_LANGUAGE"],
    },
    "Adult content": {
        "keywords": ["adult", "escort", "xxx", "sensual", "private gallery", "intimate"],
        "reason_codes": ["ADULT_TERMS", "AGE_RESTRICTED_CONTENT"],
    },
    "General commerce / benign": {
        "keywords": ["store", "shop", "catalog", "cart", "delivery", "checkout", "official"],
        "reason_codes": ["GENERAL_COMMERCE_SIGNAL"],
    },
}

QUEUE_BY_CATEGORY = {
    "Illegal or suspicious pharmacy": "Ministry of Health review queue",
    "Gambling": "Police review queue",
    "Adult content": "MCMC review queue",
    "General commerce / benign": "Customs review queue",
    "Unknown / needs review": "MCMC review queue",
}

RISK_BY_CATEGORY = {
    "Illegal or suspicious pharmacy": "High",
    "Gambling": "High",
    "Adult content": "Medium",
    "General commerce / benign": "Low",
    "Unknown / needs review": "Medium",
}

SIGNAL_PATTERNS = [
    ("MYR pricing", r"\b(?:rm|myr)\s?\d+", 22),
    ("Malay language usage", r"\b(?:harga|ubat|penghantaran|pelanggan|promosi|cepat)\b", 16),
    ("Domestic shipping references", r"\b(?:shipping to malaysia|penghantaran malaysia|poslaju|west malaysia|east malaysia)\b", 16),
    ("Domestic phone numbers", r"\b(?:\+60|03-|04-|07-|011-)\b", 14),
    ("Local jurisdiction addresses", r"\b(?:kuala lumpur|selangor|penang|johor|putrajaya|shah alam)\b", 12),
    ("References to domestic consumers", r"\b(?:malaysian customers|pengguna malaysia|untuk rakyat malaysia)\b", 10),
    ("Local market positioning", r"\b(?:trusted by malaysia|for malaysia market|kedai malaysia)\b", 10),
]
TARGETING_THRESHOLD = 35


@dataclass
class AnalysisOutput:
    category: str
    confidence: float
    risk_level: str
    reason_codes: list[str]
    needs_review: bool
    explanation: str


@dataclass
class TargetingOutput:
    score: float
    targeted: bool
    top_signals: list[dict]
    explanation: str


def extract_keywords(content: str) -> list[str]:
    words = re.findall(r"[a-zA-Z0-9+.-]{4,}", content.lower())
    seen: list[str] = []
    for word in words:
        if word not in seen:
            seen.append(word)
        if len(seen) == 12:
            break
    return seen


def analyse_category(url: str, content: str) -> AnalysisOutput:
    text = f"{url} {content}".lower()
    scores: dict[str, int] = {}
    reasons: dict[str, list[str]] = {}
    for category, rule in CATEGORY_RULES.items():
        hits = [keyword for keyword in rule["keywords"] if keyword in text]
        if hits:
            scores[category] = len(hits)
            reasons[category] = rule["reason_codes"] + [f"Matched terms: {', '.join(hits[:4])}"]

    if not scores:
        category = "Unknown / needs review"
        confidence = 0.51
        reason_codes = ["LIMITED_SIGNAL_COVERAGE", "ANALYST_REVIEW_RECOMMENDED"]
    else:
        category = max(scores, key=scores.get)
        raw_score = scores[category]
        confidence = min(0.55 + raw_score * 0.11, 0.96)
        reason_codes = reasons[category]

    needs_review = confidence < 0.68 or category == "Unknown / needs review"
    explanation = (
        f"The rules engine classified this site as {category.lower()} based on "
        f"observable on-page and URL indicators. Findings remain decision-support only."
    )
    return AnalysisOutput(
        category=category,
        confidence=round(confidence, 2),
        risk_level=RISK_BY_CATEGORY[category],
        reason_codes=reason_codes,
        needs_review=needs_review,
        explanation=explanation,
    )


def analyse_malaysia_targeting(content: str) -> TargetingOutput:
    lowered = content.lower()
    signals: list[dict] = []
    total = 0
    for label, pattern, points in SIGNAL_PATTERNS:
        matches = re.findall(pattern, lowered, flags=re.IGNORECASE)
        if matches:
            total += points
            evidence = matches[0] if isinstance(matches[0], str) else str(matches[0])
            signals.append({"label": label, "points": points, "evidence": evidence})

    score = min(total, 100)
    targeted = score >= TARGETING_THRESHOLD
    explanation = (
        "Target-market score is derived from transparent market-facing indicators "
        "including pricing, language, shipping references, phone patterns, and address markers."
    )
    return TargetingOutput(
        score=round(float(score), 1),
        targeted=targeted,
        top_signals=signals[:5],
        explanation=explanation,
    )


def build_targeting_model(score: float, targeted: bool, signals: list[dict]) -> dict:
    return {
        "threshold": TARGETING_THRESHOLD,
        "score": score,
        "targeted": targeted,
        "decision_rule": (
            f"Flag as jurisdiction-targeted when transparent market-facing signals reach {TARGETING_THRESHOLD} points."
        ),
        "signal_rows": [
            {
                "label": signal["label"],
                "points": signal["points"],
                "evidence": signal["evidence"],
                "contribution": f"+{signal['points']} points",
            }
            for signal in signals
        ],
    }


def build_routing_policy(category: str, malaysia_targeted: bool, queue_name: str, risk_level: str, confidence: float) -> dict:
    return {
        "recommended_queue": queue_name,
        "policy_steps": [
            {
                "title": "Category policy mapping",
                "detail": f"{category} cases default to {queue_name} under the proposal routing model.",
            },
            {
                "title": "Target-market check",
                "detail": (
                    "Target-market threshold met, supporting queue prioritisation for domestic review relevance."
                    if malaysia_targeted
                    else "Target-market threshold not met, so routing remains conservative and advisory."
                ),
            },
            {
                "title": "Risk and confidence posture",
                "detail": f"Risk level is {risk_level.lower()} with classifier confidence {confidence:.2f}; analyst validation remains mandatory.",
            },
        ],
    }


def assign_queue(category: str, malaysia_targeted: bool) -> str:
    queue = QUEUE_BY_CATEGORY.get(category, "MCMC review queue")
    if category == "General commerce / benign" and malaysia_targeted:
        return "Customs review queue"
    return queue


def derive_final_url(url: str) -> str:
    parsed = urlparse(url)
    domain = parsed.netloc or parsed.path
    domain = domain.removeprefix("www.")
    return f"https://{domain}/landing"

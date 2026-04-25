# Malaysia Web Intelligence Proposal Demo

Polished full-stack proposal demo for a Malaysia-targeted web intelligence platform. The application demonstrates how a regulator-style workflow can intake suspicious URLs, simulate crawl and feature extraction, score Malaysia-targeting signals, classify regulatory risk, generate explainable case summaries, and route cases to agency review queues.

The system is intentionally framed as decision-support only. It does not implement blocking, takedown, or enforcement automation.

## What is included

- Executive overview dashboard with KPI cards, charts, recent cases, and workload summaries
- URL intake workflow with manual entry, bulk processing, and recent submission tracking
- Analysis pipeline walkthrough for proposal demonstrations
- Case detail page with screenshot placeholder, rationale, timeline, and review controls
- Agency queue pages for Ministry of Health, Customs, Police, and MCMC style routing
- Analytics page with scan, risk, routing, and review outcome trends
- Proposal and architecture page for steering committee review
- Demo data studio for reseeding realistic synthetic data
- FastAPI backend with SQLite, seeded demo records, explainable services, and tests

## Repository structure

```text
malaysia-web-intelligence-demo/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── services/
│   └── requirements.txt
├── data/
├── docs/
│   ├── api-examples.md
│   └── architecture.md
├── frontend/
│   ├── src/
│   └── package.json
├── scripts/
│   └── seed_demo.py
└── tests/
```

## Architecture

See [docs/architecture.md](/Users/tarmarajapadrasono/malaysia-web-intelligence-demo/docs/architecture.md) for the Mermaid diagram and proposal notes.

## Local run instructions

### Backend

```bash
cd /Users/tarmarajapadrasono/malaysia-web-intelligence-demo
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
PYTHONPATH=backend uvicorn app.main:app --reload
```

The backend runs on `http://127.0.0.1:8000`. On first startup it creates `data/demo.db`, generates synthetic screenshots under `data/assets/screenshots/`, and seeds the demo dataset.

### Frontend

Open a second terminal:

```bash
cd /Users/tarmarajapadrasono/malaysia-web-intelligence-demo/frontend
npm install
npm run dev
```

The frontend runs on `http://127.0.0.1:5173` and targets the backend at `http://127.0.0.1:8000` by default.

Optional environment override:

```bash
VITE_API_BASE=http://127.0.0.1:8000 npm run dev
```

## Netlify deployment

The frontend can be deployed to Netlify directly. The FastAPI backend should be deployed separately to a platform that supports a long-running Python web service, such as Render, Railway, Fly.io, or Cloud Run.

This repository already includes [netlify.toml](/Users/tarmarajapadrasono/malaysia-web-intelligence-demo/netlify.toml) with:

- base directory: `frontend`
- build command: `npm run build`
- publish directory: `dist`
- SPA rewrite rule: `/* -> /index.html`

Before deploying to Netlify:

1. Deploy the backend to a separate host.
2. In Netlify, set `VITE_API_BASE` to your backend URL.
3. Import this repository into Netlify and deploy.

Example production variable:

```bash
VITE_API_BASE=https://your-api.example.com
```

You can copy [frontend/.env.example](/Users/tarmarajapadrasono/malaysia-web-intelligence-demo/frontend/.env.example) for local reference, but don’t commit real production values.

## Seed data and demo logic

- Seed generation is intentionally synthetic and clearly marked as mock/demo logic.
- Screenshot captures are generated SVG placeholders, not live web captures.
- Classification uses a rule-based engine with visible reason codes.
- Malaysia-targeting uses a transparent points-based scoring model.
- Queue routing uses category-to-agency mapping with simple policy overrides.

To reseed the dataset:

```bash
cd /Users/tarmarajapadrasono/malaysia-web-intelligence-demo
source .venv/bin/activate
PYTHONPATH=backend python scripts/seed_demo.py
```

## API examples

See [docs/api-examples.md](/Users/tarmarajapadrasono/malaysia-web-intelligence-demo/docs/api-examples.md).

## Testing

```bash
cd /Users/tarmarajapadrasono/malaysia-web-intelligence-demo
source .venv/bin/activate
pytest tests
```

## Screenshots

After starting the backend and frontend, capture these proposal-ready views for a deck:

- Executive Overview
- Analysis Pipeline
- Case Detail
- Agency Queue
- Proposal And Architecture

Generated placeholder case imagery is stored under [data/assets/screenshots](/Users/tarmarajapadrasono/malaysia-web-intelligence-demo/data/assets/screenshots).

## Notes for reviewers

- This demo is for proposal evaluation, not production enforcement.
- All automated outputs should be interpreted as advisory findings for human review.
- Placeholder escalation language is intentional and does not imply operational law-enforcement workflow.

# Architecture Diagram

```mermaid
flowchart LR
    A["URL Intake<br/>Manual entry / bulk upload / demo seeding"] --> B["Crawl and Capture<br/>Mock content capture + screenshot placeholder"]
    B --> C["Feature Extraction<br/>Keywords, entities, pricing, language, shipping references"]
    C --> D["Explainable Classification Engine<br/>Rules and reason codes"]
    C --> E["Target-Market Scoring Engine<br/>Transparent signal scoring"]
    D --> F["Case Generation Service<br/>Summary, evidence, rationale, timeline"]
    E --> F
    F --> G["Routing Policy Service<br/>Queue recommendation"]
    G --> H["Agency Queues<br/>MOH / Customs / Police / MCMC"]
    F --> I["Executive Dashboard<br/>KPIs, charts, recent cases, workload"]
    F --> J["Case Review Workspace<br/>Evidence, review history, analyst notes"]
    H --> K["Analytics and Proposal Views<br/>Trends, roadmap, governance framing"]
    L["SQLite Demo Store"] --- B
    L --- C
    L --- D
    L --- E
    L --- F
    L --- G
```

## Notes

- The demo uses seeded synthetic data and placeholder screenshot captures.
- All findings are framed as analyst decision-support, not enforcement automation.
- Queue routing is configuration-driven and intentionally transparent for proposal review.

# API Examples

## Health

```bash
curl http://127.0.0.1:8000/health
```

## Executive overview

```bash
curl http://127.0.0.1:8000/stats/overview
```

## Analytics

```bash
curl http://127.0.0.1:8000/stats/analytics
```

## Create and analyse a URL

```bash
curl -X POST http://127.0.0.1:8000/urls \
  -H "Content-Type: application/json" \
  -d '{"url":"https://sample-market-watch.example","source":"manual-entry"}'
```

```bash
curl -X POST http://127.0.0.1:8000/analyze/73
```

## Bulk intake

```bash
curl -X POST http://127.0.0.1:8000/urls/bulk \
  -H "Content-Type: application/json" \
  -d '{"source":"bulk-upload","urls":["https://alpha.example","https://beta.example"]}'
```

## Case review update

```bash
curl -X PATCH http://127.0.0.1:8000/cases/1/review \
  -H "Content-Type: application/json" \
  -d '{"reviewer_name":"Lead Analyst","review_status":"in-review","notes":"Evidence reviewed for queue readiness.","analyst_owner":"Nur Aina"}'
```

## Queue retrieval

```bash
curl "http://127.0.0.1:8000/queues/Ministry%20of%20Health%20review%20queue"
```

## Demo reseed

```bash
curl -X POST http://127.0.0.1:8000/demo/seed \
  -H "Content-Type: application/json" \
  -d '{"count":72,"reset":true}'
```


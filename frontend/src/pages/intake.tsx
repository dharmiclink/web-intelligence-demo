import { AlertCircle, ArrowRight, CopyPlus, FileUp, Link as LinkIcon, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LoadingPanel } from "../components/loading-panel";
import { SectionHeader } from "../components/section-header";
import { StatusPill } from "../components/status-pill";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { api } from "../lib/api";
import type { URLSubmission } from "../lib/types";
import { formatDate } from "../lib/utils";

const sampleUrls = [
  "https://rapid-rx-portal.example",
  "https://nusantara-jackpot-hub.example",
  "https://malaysia-market-catalog.example",
  "https://opaque-routing-board.example",
];

export function IntakePage() {
  const [url, setUrl] = useState("");
  const [bulk, setBulk] = useState("");
  const [recent, setRecent] = useState<URLSubmission[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const bulkUrls = useMemo(
    () => bulk.split("\n").map((item) => item.trim()).filter(Boolean),
    [bulk],
  );

  async function refreshRecent() {
    setRecent(await api.listUrls());
  }

  useEffect(() => {
    refreshRecent();
  }, []);

  async function handleSubmitSingle() {
    if (!url.trim()) {
      setMessage("Enter a URL to process.");
      return;
    }

    setProcessing(true);
    setMessage(null);
    try {
      const submission = await api.createUrl({ url, source: "manual-entry" });
      const result = await api.analyzeUrl(submission.id);
      setMessage(`Submission processed. Case ${result.case_id} is available for review.`);
      setUrl("");
      await refreshRecent();
    } finally {
      setProcessing(false);
    }
  }

  async function handleSubmitBulk() {
    if (!bulkUrls.length) {
      setMessage("Add one URL per line for bulk intake.");
      return;
    }

    setProcessing(true);
    setMessage(null);
    try {
      for (const item of bulkUrls) {
        const submission = await api.createUrl({ url: item, source: "bulk-upload" });
        await api.analyzeUrl(submission.id);
      }
      setMessage(`Processed ${bulkUrls.length} URLs through the proposal pipeline.`);
      setBulk("");
      await refreshRecent();
    } finally {
      setProcessing(false);
    }
  }

  if (!recent) {
    return <LoadingPanel label="Loading intake controls..." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="URL Intake"
        title="Case Intake And Analysis Trigger"
        description="Submit suspicious URLs, stage bulk batches, and push candidate sites into the explainable analysis pipeline used in the proposal workflow."
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <LinkIcon className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Manual submission</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">Single URL intake</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://suspicious-example.example"
            />
            <div className="rounded-2xl border border-dashed border-line bg-canvas/70 p-4 text-sm text-slate-600">
              Validation checks cover URL format, duplicate submissions, and demo pipeline readiness.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSubmitSingle} disabled={processing}>
                Process URL
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setUrl(sampleUrls[0]);
                }}
              >
                Load sample URL
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <FileUp className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Bulk upload</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">Batch intake area</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <Textarea
              value={bulk}
              onChange={(event) => setBulk(event.target.value)}
              placeholder="Add one URL per line to simulate a batch intake run."
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSubmitBulk} disabled={processing}>
                Process batch
              </Button>
              <Button
                variant="secondary"
                onClick={() => setBulk(sampleUrls.join("\n"))}
              >
                <CopyPlus className="mr-2 h-4 w-4" />
                Example sample URLs
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              {bulkUrls.length} URL{bulkUrls.length === 1 ? "" : "s"} staged for processing.
            </p>
          </div>
        </Card>
      </section>

      {message ? (
        <Card className="border-accentSoft bg-accentSoft/35 p-5">
          <div className="flex items-start gap-3">
            <WandSparkles className="mt-0.5 h-4 w-4 text-accent" />
            <p className="text-sm text-slate-700">{message}</p>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recent submissions</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">Operational intake log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">URL</th>
                  <th className="px-6 py-4 font-medium">Source</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={item.id} className="border-t border-line/70">
                    <td className="px-6 py-4 font-medium text-ink">{item.url}</td>
                    <td className="px-6 py-4 text-slate-600">{item.source}</td>
                    <td className="px-6 py-4">
                      <StatusPill value={item.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(item.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Submission guidance</p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <div className="rounded-2xl border border-line bg-canvas/60 p-4">
              Manual intake is intended for demonstration of one-off case review scenarios during proposal presentations.
            </div>
            <div className="rounded-2xl border border-line bg-canvas/60 p-4">
              Bulk intake simulates queue pressure, trend analysis, and cross-agency routing at POC scale.
            </div>
            <div className="rounded-2xl border border-line bg-canvas/60 p-4">
              All outputs remain advisory. Placeholder escalation logic is clearly marked to avoid implying automated enforcement.
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-700" />
              <p>Use synthetic URLs for the seeded demo. No offensive security or takedown features are included.</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}


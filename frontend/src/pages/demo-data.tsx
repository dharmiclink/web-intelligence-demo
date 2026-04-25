import { DatabaseZap, RefreshCcw } from "lucide-react";
import { useState } from "react";

import { SectionHeader } from "../components/section-header";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";

export function DemoDataPage() {
  const [count, setCount] = useState("72");
  const [message, setMessage] = useState("Seeded data powers the current dashboard views.");
  const [working, setWorking] = useState(false);

  async function reseed(reset: boolean) {
    setWorking(true);
    try {
      const result = await api.seedDemo({ count: Number(count) || 72, reset });
      setMessage(`${result.message}. ${result.count} records are available.`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Demo Data Studio"
        title="Seed Generator And Presentation Data Controls"
        description="Regenerate a realistic, presentation-ready dataset for walkthroughs, screenshots, and proposal demonstrations. Seeded records are clearly synthetic and safe for local evaluation."
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <DatabaseZap className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Generator controls</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">Seed the demo environment</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <Input value={count} onChange={(event) => setCount(event.target.value)} placeholder="72" />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => reseed(true)} disabled={working}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset and reseed
              </Button>
              <Button variant="secondary" onClick={() => reseed(false)} disabled={working}>
                Add demo records
              </Button>
            </div>
            <p className="text-sm text-slate-600">{message}</p>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Seed composition</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SeedPanel title="Volume" copy="Generates 50 to 100 credible synthetic URLs and case records by default." />
            <SeedPanel title="Variety" copy="Blends suspicious pharmacy, gambling, adult content, benign commerce, and unknown review scenarios." />
            <SeedPanel title="Target-market signals" copy="Introduces transparent evidence such as MYR pricing, Malay language markers, shipping references, and local phone patterns." />
            <SeedPanel title="Presentation assets" copy="Creates synthetic screenshot placeholders and trend timestamps suitable for proposal decks." />
          </div>
        </Card>
      </section>
    </div>
  );
}

function SeedPanel({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-3xl border border-line bg-canvas/70 p-5">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
    </div>
  );
}

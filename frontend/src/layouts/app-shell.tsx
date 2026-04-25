import { BarChart3, Building2, FileSearch, Gauge, GitBranchPlus, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "../lib/utils";

const navItems = [
  { to: "/", label: "Executive Overview", icon: Gauge },
  { to: "/intake", label: "URL Intake", icon: GitBranchPlus },
  { to: "/pipeline", label: "Analysis Pipeline", icon: Layers3 },
  { to: "/queues/Ministry%20of%20Health%20review%20queue", label: "Agency Queues", icon: Building2 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/proposal", label: "Proposal & Architecture", icon: ShieldCheck },
  { to: "/demo-data", label: "Demo Data Studio", icon: Sparkles },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-line/80 bg-white/90 px-6 py-6 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-[300px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full bg-accentSoft px-4 py-2 text-sm font-semibold text-accent">
                <FileSearch className="h-4 w-4" />
                National Web Intelligence Proposal Demo
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold leading-tight text-ink">
                  Jurisdictional Compliance Intelligence
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Decision-support workflow for regulatory triage, explainable classification, and agency routing.
                </p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive ? "bg-ink text-white shadow-panel" : "text-slate-600 hover:bg-canvas hover:text-ink",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="rounded-3xl border border-line bg-gradient-to-br from-[#0D2742] to-[#124c76] p-5 text-white shadow-panel">
              <p className="text-xs uppercase tracking-[0.18em] text-white/70">Proposal framing</p>
              <p className="mt-3 font-display text-xl font-bold">Advisory workflow only</p>
              <p className="mt-2 text-sm leading-6 text-white/80">
                Automated findings are framed as analyst support. The demo avoids takedown, blocking, or enforcement automation.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 md:px-8 lg:px-10">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-panel backdrop-blur md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-accentSoft px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  Proposal Demo
                </div>
                <p className="font-display text-xl font-extrabold text-ink">
                  Web Intelligence Proposal Demo
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  Advisory workflow only. The experience is optimized for executive walkthroughs, analyst review, and proposal evaluation.
                </p>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/70 bg-hero-grid p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

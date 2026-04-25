import { motion } from "framer-motion";

import type { KPIBlock } from "../lib/types";
import { Card } from "./ui/card";

export function KpiCard({ item, index }: { item: KPIBlock; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
    >
      <Card className="h-full p-6">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
          <div className="flex items-end justify-between gap-4">
            <p className="font-display text-3xl font-extrabold text-ink">{item.value}</p>
            <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-slate-600">{item.delta}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}


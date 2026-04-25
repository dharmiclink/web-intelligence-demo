import { Route, Routes } from "react-router-dom";

import { AppShell } from "./layouts/app-shell";
import { AnalyticsPage } from "./pages/analytics";
import { CaseDetailPage } from "./pages/case-detail";
import { DemoDataPage } from "./pages/demo-data";
import { IntakePage } from "./pages/intake";
import { OverviewPage } from "./pages/overview";
import { PipelinePage } from "./pages/pipeline";
import { ProposalPage } from "./pages/proposal";
import { QueuePage } from "./pages/queue";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/intake" element={<IntakePage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/queues/:name" element={<QueuePage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/proposal" element={<ProposalPage />} />
        <Route path="/demo-data" element={<DemoDataPage />} />
      </Routes>
    </AppShell>
  );
}


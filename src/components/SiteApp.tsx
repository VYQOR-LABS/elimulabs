"use client";

import { useState } from "react";
import AccountDialog from "./AccountDialog";
import AppShell from "./AppShell";
import AboutPage from "../features/pages/AboutPage";
import CareerPage from "../features/pages/CareerPage";
import DocumentsPage from "../features/pages/DocumentsPage";
import ExamPage from "../features/pages/ExamPage";
import HistoryPage from "../features/pages/HistoryPage";
import ResourcesPage from "../features/pages/ResourcesPage";
import WalletPage from "../features/pages/WalletPage";
import type { SectionId } from "../types";

export default function SiteApp({
  initialSection,
}: {
  initialSection: SectionId;
}): React.ReactElement {
  const [showAccount, setShowAccount] = useState(false);

  function renderPage(): React.ReactElement {
    switch (initialSection) {
      case "documents": return <DocumentsPage />;
      case "exam": return <ExamPage />;
      case "career": return <CareerPage />;
      case "about": return <AboutPage />;
      case "history": return <HistoryPage />;
      case "wallet": return <WalletPage />;
      default: return <ResourcesPage />;
    }
  }

  return (
    <AppShell
      active={initialSection}
      onAccount={() => setShowAccount(true)}
    >
      {renderPage()}
      {showAccount && <AccountDialog onClose={() => setShowAccount(false)} />}
    </AppShell>
  );
}

"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export default function DocumentDownloads({
  documentId,
}: {
  documentId: string;
}): React.ReactElement {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function download(format: "pdf" | "docx"): Promise<void> {
    setBusy(format);
    setError("");
    try {
      const response = await fetch(`/api/documents/${documentId}/download?format=${format}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "The download could not be completed.");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `elimulabs-document.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The download could not be completed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button className="button-secondary" type="button" disabled={Boolean(busy)} onClick={() => download("pdf")}>
        <Download size={16} /> {busy === "pdf" ? "Preparing..." : "Download PDF"}
      </button>
      <button className="button-secondary" type="button" disabled={Boolean(busy)} onClick={() => download("docx")}>
        <Download size={16} /> {busy === "docx" ? "Preparing..." : "Download Word"}
      </button>
      {error && <p role="alert" className="basis-full text-sm text-red-700">{error}</p>}
    </div>
  );
}

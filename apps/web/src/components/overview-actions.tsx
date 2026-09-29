"use client";

import Link from "next/link";
import { Check, ChevronDown, Copy, Download, FileText, Share2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { overviewFixture } from "@/data/overview";

export function OverviewActions() {
  const [menu, setMenu] = useState<"export" | "share" | null>(null); const [copied, setCopied] = useState(false);
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && setMenu(null); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);

  function exportCsv() {
    const rows = [["Metric", "Value"], ...overviewFixture.progress.map((item) => [item.label, item.value])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "north-river-overview-2026-09-26.csv"; anchor.click(); URL.revokeObjectURL(url); setMenu(null);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  return <div className="page-actions"><div className="action-popover-anchor"><button className="button secondary" onClick={() => setMenu(menu === "export" ? null : "export")} aria-expanded={menu === "export"}><Download size={14} />Export<ChevronDown size={12} /></button>{menu === "export" && <div className="action-menu"><div className="action-menu-head"><strong>Export Overview</strong><button className="icon-button" aria-label="Close export menu" onClick={() => setMenu(null)}><X size={14} /></button></div><button onClick={exportCsv}><FileText size={14} /><span><strong>Export CSV</strong><small>Progress summary</small></span></button><button disabled><FileText size={14} /><span><strong>Export PDF</strong><small>Coming later</small></span></button></div>}</div><div className="action-popover-anchor"><button className="button secondary" onClick={() => setMenu(menu === "share" ? null : "share")} aria-expanded={menu === "share"}><Share2 size={14} />Share</button>{menu === "share" && <div className="action-menu share-menu"><div className="action-menu-head"><strong>Share Overview</strong><button className="icon-button" aria-label="Close share menu" onClick={() => setMenu(null)}><X size={14} /></button></div><p>Share the current command-center view.</p><button onClick={copyLink}><span className="share-icon">{copied ? <Check size={14} /> : <Copy size={14} />}</span><span><strong>{copied ? "Link copied" : "Copy overview link"}</strong><small>{copied ? "Ready to share" : "Copy to clipboard"}</small></span></button></div>}</div><Link className="button primary" href="/data-ingestion"><Upload size={14} />Import Update</Link></div>;
}

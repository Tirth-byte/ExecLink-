import Link from "next/link";
import { ArrowLeft, PanelsTopLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";

const futureSections: Record<string, { title: string; task: string }> = {
  "audit-trail": { title: "Audit Trail", task: "a later integration task" },
  "help": { title: "Help", task: "a later support task" },
};

export default async function FutureSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params; const target = futureSections[section];
  if (!target) notFound();
  return <AppShell current={target.title}><div className="placeholder-page"><section className="surface placeholder-card"><div className="placeholder-mark"><PanelsTopLeft size={20} /></div><p className="eyebrow">Future workspace</p><h1>{target.title}</h1><h2>This route is reserved for {target.task}.</h2><p>No feature implementation has been started here.</p><Link className="button secondary" href="/"><ArrowLeft size={14} />Return to Overview</Link></section></div></AppShell>;
}

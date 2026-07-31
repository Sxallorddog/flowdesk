import type { Metadata } from "next";
import { CrmApp } from "../../../components/crm-app";

export const metadata: Metadata = { title: "Робочий простір — FlowDesk", robots: { index: false, follow: false } };

export default async function WorkspacePage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  return <CrmApp section={section[0] ?? "dashboard"} />;
}

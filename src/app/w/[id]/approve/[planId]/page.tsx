import type { Metadata } from "next";
import { SimulationBand } from "@/ui/brand";
import { ApprovalDocument } from "@/ui/workspace/ApprovalDocument";

export const metadata: Metadata = { title: "Payment approval", robots: { index: false, follow: false } };

export default async function ApprovalPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  return (
    <div className="min-h-dvh">
      <SimulationBand />
      <main id="main">
        <ApprovalDocument workspaceId={id} planId={planId} />
      </main>
    </div>
  );
}

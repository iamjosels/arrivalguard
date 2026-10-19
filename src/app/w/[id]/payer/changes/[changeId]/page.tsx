import type { Metadata } from "next";
import { SimulationBand } from "@/ui/brand";
import { ChangeConfirmation } from "@/ui/workspace/ChangeConfirmation";

export const metadata: Metadata = { title: "Confirm change", robots: { index: false, follow: false } };

export default async function ChangePage({ params }: { params: Promise<{ id: string; changeId: string }> }) {
  const { id, changeId } = await params;
  return (
    <div className="min-h-dvh">
      <SimulationBand />
      <main id="main">
        <ChangeConfirmation workspaceId={id} changeId={changeId} />
      </main>
    </div>
  );
}

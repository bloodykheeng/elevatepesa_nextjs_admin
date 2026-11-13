import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import AuditTrailList from "./AuditTrailList";

export const metadata: Metadata = { title: "Audit trail" };

export default function AuditTrailPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <AuditTrailList />
      </Suspense>
    </div>
  );
}

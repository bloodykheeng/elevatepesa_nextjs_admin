import { Suspense } from "react";
import DashboardHome from "@/components/dashboard/home/DashboardHome";
import { ReportPageSkeleton } from "@/components/dashboard/RecordSkeleton";

/** The dashboard: figures for a period, all time by default. */
export default function DashboardPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ReportPageSkeleton padded={false} />}>
        <DashboardHome />
      </Suspense>
    </div>
  );
}

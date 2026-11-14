import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import QueuesList from "./QueuesList";

export const metadata: Metadata = { title: "Queues" };

export default function QueuesPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <QueuesList />
      </Suspense>
    </div>
  );
}

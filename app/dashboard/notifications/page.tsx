import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import Inbox from "./Inbox";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <Inbox />
      </Suspense>
    </div>
  );
}

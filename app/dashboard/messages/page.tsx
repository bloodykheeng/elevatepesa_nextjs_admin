import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import MessagesList from "./MessagesList";

export const metadata: Metadata = { title: "Messages to customers" };

export default function MessagesPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <MessagesList />
      </Suspense>
    </div>
  );
}

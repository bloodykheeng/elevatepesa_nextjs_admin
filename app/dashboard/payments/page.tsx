import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import PaymentsList from "@/components/dashboard/admin/PaymentsList";

export const metadata: Metadata = { title: "Order payments" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <PaymentsList kind="payments" />
      </Suspense>
    </div>
  );
}

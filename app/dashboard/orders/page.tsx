import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import OrdersList from "./OrdersList";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <OrdersList />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import ProductsList from "./ProductsList";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <ProductsList />
      </Suspense>
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { CardsPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import Roles from "./Roles";

export const metadata: Metadata = { title: "Roles & access" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<CardsPageSkeleton padded={false} />}>
        <Roles />
      </Suspense>
    </div>
  );
}

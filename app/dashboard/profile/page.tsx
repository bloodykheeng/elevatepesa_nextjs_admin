import type { Metadata } from "next";
import { Suspense } from "react";
import { CardsPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import Profile from "./Profile";

export const metadata: Metadata = { title: "Your profile" };

export default function Page() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<CardsPageSkeleton padded={false} />}>
        <Profile />
      </Suspense>
    </div>
  );
}

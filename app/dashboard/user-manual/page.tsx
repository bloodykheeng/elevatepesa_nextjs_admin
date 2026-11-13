import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/dashboard/ui";
import UserManual from "./UserManual";
import { CardsPageSkeleton } from "@/components/dashboard/RecordSkeleton";

export const metadata: Metadata = { title: "User manual" };

export default function UserManualPage() {
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <PageHeader title="User manual" subtitle="What each part of the Elevate Pesa dashboard is for, and how to do the work your role covers." />
      <Suspense fallback={<CardsPageSkeleton padded={false} />}>
        <UserManual />
      </Suspense>
    </div>
  );
}

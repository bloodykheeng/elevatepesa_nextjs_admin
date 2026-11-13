import type { Metadata } from "next";
import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";

export const metadata: Metadata = {
  title: {
    template: "%s | Elevate Pesa Admin",
    default: "Dashboard",
  },
  // Signed-in pages are nobody's to index or share.
  robots: { index: false, follow: false },
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

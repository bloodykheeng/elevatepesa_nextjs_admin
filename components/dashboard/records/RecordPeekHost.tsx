"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePeek } from "./peek";
import { OpenInPage } from "./shared";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { PackageDetailsDialog } from "./PackageDetailsDialog";
import { PaymentDetailsDialog } from "./PaymentDetailsDialog";
import { CustomerDetailsDialog } from "./CustomerDetailsDialog";

/**
 * Draws the records opened over the page (peek.tsx), newest on top. Each has Close and a way to its own page,
 * where its Edit and Record payment are.
 */
export default function RecordPeekHost() {
  const { stack, close } = usePeek();
  const { role } = useAuth();
  return (
    <>
      {stack.map((p) => {
        const common = { id: p.id, visible: true, onHide: () => close(p.uid) };
        switch (p.type) {
          case "order":
            return <OrderDetailsDialog key={p.uid} {...common} actions={(o) => <OpenInPage type="order" id={o.id} />} />;
          case "package":
            return <PackageDetailsDialog key={p.uid} {...common} actions={(k) => <OpenInPage type="package" id={k.id} />} />;
          case "user":
            // Customers & staff is the Admins' page; an Editor reads the customer here and stays.
            return <CustomerDetailsDialog key={p.uid} {...common} actions={(u) => (role === "Admin" ? <OpenInPage type="user" id={u.id} /> : null)} />;
          case "payment":
          case "package-payment":
            return <PaymentDetailsDialog key={p.uid} kind={p.type} {...common} actions={(x) => <OpenInPage type={p.type} id={x.id} />} />;
        }
      })}
    </>
  );
}

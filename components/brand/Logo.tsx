import React from "react";
import Link from "next/link";
import Image from "next/image";

/** The Elevate Pesa bag on its green tile (public/brand/mark.png, cut from the approved logo). */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <Image
      src="/brand/mark.png"
      alt=""
      width={256}
      height={256}
      priority
      className={`rounded-[22%] object-cover ${className}`}
    />
  );
}

/** Mark + "Elevate Pesa", for the sidebar and the sign-in page. */
export default function Logo({ href = "/dashboard", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9" />
      <span className="text-xl font-bold tracking-tight text-(--brand-ink)">Elevate Pesa</span>
    </Link>
  );
}

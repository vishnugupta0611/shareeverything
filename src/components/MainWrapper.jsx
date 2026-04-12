"use client";
import { usePathname } from "next/navigation";

export default function MainWrapper({ children }) {
  const pathname = usePathname();
  const noNav = pathname === "/" || pathname?.startsWith("/instant");
  return (
    <main className={noNav ? "m-0" : "pt-16 sm:pt-20 m-0"}>
      {children}
    </main>
  );
}

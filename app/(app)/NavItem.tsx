"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    if (href === "/" && pathname === "/") {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("timetable:jump-today"));
      return;
    }
    if (href === "/") {
      // Navigating back to timetable — also jump to today.
      sessionStorage.setItem("timetable:jump-today", "1");
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors py-1 px-4"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "表紙" },
  { href: "/karte", label: "カルテ" },
  { href: "/board", label: "目安箱" },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="mx-auto max-w-4xl px-4 flex gap-1.5">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`font-display text-sm px-4 pt-1.5 pb-2 rounded-t-md transition-colors
              ${active
                ? "bg-(--color-paper) text-(--color-ink)"
                : "bg-(--color-tab-deep) text-(--color-paper) hover:bg-(--color-tab)"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

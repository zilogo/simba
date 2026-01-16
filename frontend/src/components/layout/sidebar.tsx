"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { useBrand } from "@/providers/brand-provider";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  BarChart3,
  ClipboardCheck,
  Rocket,
  HelpCircle,
  Play,
  Settings,
} from "lucide-react";

const navigation = [
  { key: "dashboard", href: ROUTES.HOME, icon: LayoutDashboard },
  { key: "playground", href: ROUTES.PLAYGROUND, icon: Play },
  { key: "documents", href: ROUTES.DOCUMENTS, icon: FileText },
  { key: "conversations", href: ROUTES.CONVERSATIONS, icon: MessageSquare },
  { key: "analytics", href: ROUTES.ANALYTICS, icon: BarChart3 },
  { key: "evals", href: ROUTES.EVALS, icon: ClipboardCheck },
  { key: "deploy", href: ROUTES.DEPLOY, icon: Rocket },
  { key: "settings", href: ROUTES.SETTINGS, icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { appName } = useBrand();

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span className="text-lg font-bold">{appName.charAt(0).toUpperCase()}</span>
        </div>
        <span className="text-xl font-semibold">{appName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <Link
          href="https://github.com/GitHamza0206/simba"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-5 w-5" />
          {t("common.helpDocs")}
        </Link>
      </div>
    </aside>
  );
}

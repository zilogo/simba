"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Bell, Building2, Check, LogOut, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { LanguageToggle } from "@/components/common/language-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { signOut } from "@/lib/auth-client";
import { clearActiveOrgId } from "@/lib/api";

export function Header() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session, activeOrganization, organizations, setActiveOrganization } = useAuth();

  const handleSignOut = async () => {
    clearActiveOrgId();
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const handleOrgSwitch = async (orgId: string) => {
    await setActiveOrganization(orgId);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={t("common.search")}
            className="h-9 w-64 rounded-md border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Organization Selector */}
        {organizations && organizations.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="max-w-32 truncate">
                  {activeOrganization?.name || t("common.selectOrg")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("common.organizations")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleOrgSwitch(org.id)}
                  className="cursor-pointer"
                >
                  <span className="flex-1 truncate">{org.name}</span>
                  {activeOrganization?.id === org.id && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <LanguageToggle />
        <ThemeToggle />
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{session?.user?.name || t("common.user")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {session?.user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

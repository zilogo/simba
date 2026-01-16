"use client";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";
import { I18nProvider } from "./i18n-provider";
import { BrandProvider } from "./brand-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProvider>
          <QueryProvider>
            <BrandProvider>{children}</BrandProvider>
          </QueryProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

"use client";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";
import { I18nProvider } from "./i18n-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

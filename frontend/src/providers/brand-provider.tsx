"use client";

import { createContext, useContext, ReactNode } from "react";
import { useSettings } from "@/hooks/useSettings";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

interface BrandContextType {
  appName: string;
  appDescription: string;
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextType>({
  appName: APP_NAME,
  appDescription: APP_DESCRIPTION,
  isLoading: true,
});

/**
 * Provider for organization branding (app name, description).
 * Uses settings API when authenticated, falls back to defaults.
 */
export function BrandProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useSettings();

  const value: BrandContextType = {
    appName: settings?.app_name ?? APP_NAME,
    appDescription: settings?.app_description ?? APP_DESCRIPTION,
    isLoading,
  };

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

/**
 * Hook to access brand information.
 */
export function useBrand() {
  return useContext(BrandContext);
}

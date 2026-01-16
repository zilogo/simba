import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/constants";
import { useAuth } from "@/providers/auth-provider";
import type { DefaultPrompts, OrganizationSettings, SettingsUpdate } from "@/types/api";

const SETTINGS_KEY = ["settings"];
const DEFAULT_PROMPTS_KEY = ["settings", "prompts", "default"];

/**
 * Hook to fetch organization settings.
 */
export function useSettings() {
  const { isReady } = useAuth();

  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => api.get<OrganizationSettings>(API_ROUTES.SETTINGS),
    enabled: isReady,
  });
}

/**
 * Hook to update organization settings.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SettingsUpdate) =>
      api.put<OrganizationSettings>(API_ROUTES.SETTINGS, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

/**
 * Hook to fetch default prompt templates.
 */
export function useDefaultPrompts() {
  return useQuery({
    queryKey: DEFAULT_PROMPTS_KEY,
    queryFn: () => api.get<DefaultPrompts>(`${API_ROUTES.SETTINGS}/prompts/default`),
    staleTime: Infinity, // Default prompts don't change
  });
}

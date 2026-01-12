"use client";

"use client";

import dynamic from "next/dynamic";
import "simba-chat/styles.css";
import { useEffect, useState } from "react";
import { getActiveOrgId } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

const SimbaChatBubble = dynamic(
  () => import("simba-chat").then((mod) => mod.SimbaChatBubble),
  { ssr: false }
);

export function ChatWidgetWrapper() {
  const showWidget = process.env.NEXT_PUBLIC_SHOW_CHAT_WIDGET === "true";
  const { activeOrganization } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    setOrganizationId(activeOrganization?.id || getActiveOrgId() || null);
  }, [activeOrganization?.id, isMounted]);

  if (!showWidget || !isMounted || !organizationId) {
    return null;
  }

  return (
    <SimbaChatBubble
      apiUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
      organizationId={organizationId}
      position="bottom-right"
    />
  );
}

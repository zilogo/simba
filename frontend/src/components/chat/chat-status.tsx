"use client";

import { Search, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/hooks";

interface ChatStatusProps {
  tools?: ToolCall[];
  isThinking?: boolean;
  className?: string;
}

export function ChatStatus({ tools, isThinking, className }: ChatStatusProps) {
  const { t } = useTranslation();

  // Find any running tool
  const runningTool = tools?.find((t) => t.status === "running");

  if (!runningTool && !isThinking) return null;

  const getStatusText = () => {
    if (!runningTool) return t("chat.thinking");
    switch (runningTool.name) {
      case "rag":
        return t("chat.searchingDocuments");
      case "search":
        return t("chat.searching");
      default:
        return t("chat.processing");
    }
  };

  const statusText = getStatusText();

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground py-1",
        className
      )}
    >
      {runningTool?.name === "rag" ? (
        <Search className="h-3 w-3 animate-pulse" />
      ) : (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      <span>
        {statusText}
        <span className="inline-flex ml-0.5">
          <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
        </span>
      </span>
    </div>
  );
}

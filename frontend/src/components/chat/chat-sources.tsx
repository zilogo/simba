"use client";

import {
  File,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Source {
  document_name: string;
  content: string;
  score?: number;
}

interface ChatSourcesProps {
  sources: Source[];
  className?: string;
  onOpen?: () => void;
  isActive?: boolean;
}

const fileIconMap: Record<string, typeof File> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  json: FileCode,
  xml: FileCode,
  html: FileCode,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  webp: FileImage,
};

export function getSourceIcon(documentName: string) {
  const extension = documentName.split(".").pop()?.toLowerCase() ?? "";
  return fileIconMap[extension] ?? File;
}

export function ChatSources({
  sources,
  className,
  onOpen,
  isActive,
}: ChatSourcesProps) {
  if (sources.length === 0) return null;

  const label = `${sources.length} source${sources.length === 1 ? "" : "s"}`;
  const icons = sources.slice(0, 3).map((source, idx) => {
    const Icon = getSourceIcon(source.document_name);
    return (
      <span
        key={`${source.document_name}-${idx}`}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border/70"
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  });

  return (
    <div className={cn("mt-3", className)}>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
          onOpen ? "cursor-pointer" : "cursor-default",
          isActive
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted"
        )}
        aria-label="View sources"
      >
        <div className="flex -space-x-2">{icons}</div>
        <span className={cn("text-xs", isActive ? "text-primary" : "text-foreground")}>
          {label}
        </span>
      </button>
    </div>
  );
}

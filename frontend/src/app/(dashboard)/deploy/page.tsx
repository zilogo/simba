"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { API_URL } from "@/lib/constants";
import { Copy, Check, Sparkles, MessageSquare, MessageCircle, ChevronDown } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useCollections } from "@/hooks/useCollections";

const getInlineChatExample = (orgId: string, collection: string) => `// components/inline-chat.tsx
"use client";

import { SimbaChat } from 'simba-chat';
import 'simba-chat/styles.css';

export function InlineChat() {
  return (
    <SimbaChat
      apiUrl="${API_URL}"
      organizationId="${orgId}"
      collection="${collection}"
      placeholder="Ask me anything..."
    />
  );
}`;

const getBubbleChatExample = (orgId: string, collection: string) => `// components/chat-widget.tsx
"use client";

import { SimbaChatBubble } from 'simba-chat';
import 'simba-chat/styles.css';

export function ChatWidget() {
  return (
    <SimbaChatBubble
      apiUrl="${API_URL}"
      organizationId="${orgId}"
      collection="${collection}"
      position="bottom-right"
      defaultOpen={false}
    />
  );
}`;

const THEMING_EXAMPLE = `:root {
  --simba-primary: #8b5cf6;
  --simba-primary-foreground: #ffffff;
  --simba-background: #ffffff;
  --simba-foreground: #0f172a;
  --simba-muted: #f1f5f9;
  --simba-muted-foreground: #64748b;
  --simba-border: #e2e8f0;
  --simba-radius: 0.5rem;
}`;

const getAgentPrompt = (orgId: string, collection: string) => `Add a Simba chat widget to my website.

## Configuration
- API URL: ${API_URL}
- Organization ID: ${orgId}
- Collection: ${collection}

## Setup Guidelines

1. Install: \`npm install simba-chat\`

2. Import styles: \`import 'simba-chat/styles.css'\`

3. Use \`<SimbaChatBubble />\` for floating bubble or \`<SimbaChat />\` for inline embed

4. Required props: \`apiUrl\`, \`organizationId\`, \`collection\` (use values from Configuration above)

5. Optional props: \`position\` ("bottom-left" | "bottom-right"), \`defaultOpen\`, \`placeholder\`

6. For custom UI: use the \`useSimbaChat\` hook which returns \`{ messages, status, sendMessage, stop }\`

## Critical for Next.js App Router
- Create a separate Client Component file with \`"use client"\` directive at the top
- Import that component into your layout/page (Server Components can import Client Components)
- Never add \`"use client"\` to layout.tsx directly

## Theming
Override CSS variables: \`--simba-primary\`, \`--simba-background\`, \`--simba-foreground\`, \`--simba-muted\`, \`--simba-border\`, \`--simba-radius\``;

export default function DeployPage() {
  const { t } = useTranslation();
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>("default");
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);

  const { activeOrganization } = useAuth();
  const { data: collectionsData, isLoading: isLoadingCollections } = useCollections();

  const organizationId = activeOrganization?.id || "your-organization-id";
  const collections = collectionsData?.items ?? [];

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(getAgentPrompt(organizationId, selectedCollection));
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("deploy.title")}</h1>
        <p className="text-muted-foreground">
          {t("deploy.descriptionAlt")}
        </p>
      </div>

      {/* Copy Prompt for AI Assistant - TOP */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("deploy.copyPrompt")}
          </CardTitle>
          <CardDescription>
            {t("deploy.copyPromptDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Inline config */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("evals.collection")}:</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCollectionOpen(!isCollectionOpen)}
                  className="flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span>{selectedCollection}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
                {isCollectionOpen && (
                  <div className="absolute z-50 mt-1 min-w-[200px] rounded-md border bg-background shadow-lg">
                    <div className="max-h-60 overflow-auto p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCollection("default");
                          setIsCollectionOpen(false);
                        }}
                        className={`flex w-full items-center rounded px-3 py-2 text-sm hover:bg-muted ${
                          selectedCollection === "default" ? "bg-muted" : ""
                        }`}
                      >
                        default
                      </button>
                      {isLoadingCollections ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">{t("common.loading")}</div>
                      ) : (
                        collections.map((col) => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => {
                              setSelectedCollection(col.name);
                              setIsCollectionOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-muted ${
                              selectedCollection === col.name ? "bg-muted" : ""
                            }`}
                          >
                            <span>{col.name}</span>
                            <span className="text-xs text-muted-foreground">{col.document_count} docs</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t("deploy.org")}</span>
              <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{organizationId}</code>
            </div>
          </div>

          {/* Copy button */}
          <Button onClick={copyPrompt} className="w-full" size="lg">
            {copiedPrompt ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                {t("deploy.copied")}
              </>
            ) : (
              <>
                <Copy className="mr-2 h-5 w-5" />
                {t("deploy.copyIntegrationPrompt")}
              </>
            )}
          </Button>

          {/* Preview */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              {t("deploy.previewPrompt")}
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs font-mono whitespace-pre-wrap">
              {getAgentPrompt(organizationId, selectedCollection)}
            </pre>
          </details>
        </CardContent>
      </Card>

      {/* Installation */}
      <Card>
        <CardHeader>
          <CardTitle>{t("deploy.installation")}</CardTitle>
          <CardDescription>{t("deploy.installationDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code="npm install simba-chat" language="bash" />
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>{t("deploy.quickStart")}</CardTitle>
          <CardDescription>{t("deploy.quickStartDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inline Chat */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("deploy.inlineChat")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t("deploy.inlineChatDesc")}
            </p>
            <CodeBlock code={getInlineChatExample(organizationId, selectedCollection)} language="tsx" />
          </div>

          {/* Floating Bubble */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              {t("deploy.floatingBubble")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t("deploy.floatingBubbleDesc")}
            </p>
            <CodeBlock code={getBubbleChatExample(organizationId, selectedCollection)} language="tsx" />
          </div>
        </CardContent>
      </Card>

      {/* Theming */}
      <Card>
        <CardHeader>
          <CardTitle>{t("deploy.theming")}</CardTitle>
          <CardDescription>{t("deploy.themingDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={THEMING_EXAMPLE} language="css" />
        </CardContent>
      </Card>

    </div>
  );
}

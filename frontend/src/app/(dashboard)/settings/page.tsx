"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSettings, useUpdateSettings, useDefaultPrompts } from "@/hooks/useSettings";
import { Save, RotateCcw, Loader2, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type PromptLanguage = "en" | "zh";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: defaultPrompts } = useDefaultPrompts();
  const updateSettings = useUpdateSettings();

  const [appName, setAppName] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [systemPromptEn, setSystemPromptEn] = useState("");
  const [systemPromptZh, setSystemPromptZh] = useState("");
  const [activeTab, setActiveTab] = useState<PromptLanguage>("en");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with settings data
  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name || "");
      setAppDescription(settings.app_description || "");
      setSystemPromptEn(settings.system_prompt_en || "");
      setSystemPromptZh(settings.system_prompt_zh || "");
    }
  }, [settings]);

  const handleSave = async () => {
    setError(null);
    try {
      await updateSettings.mutateAsync({
        app_name: appName,
        app_description: appDescription || null,
        system_prompt_en: systemPromptEn || null,
        system_prompt_zh: systemPromptZh || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save settings";
      if (message.includes("401")) {
        setError("Please log in and select an organization to save settings.");
      } else {
        setError(message);
      }
    }
  };

  const handleResetPrompt = (language: PromptLanguage) => {
    if (!defaultPrompts) return;
    if (language === "en") {
      setSystemPromptEn(defaultPrompts.en);
    } else {
      setSystemPromptZh(defaultPrompts.zh);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your assistant branding and system prompts.
        </p>
      </div>

      {/* Branding Section */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize the name and description of your assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName">Assistant Name</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="e.g., Simba, HelpBot, Assistant"
            />
            <p className="text-xs text-muted-foreground">
              This name will be shown throughout the UI and in chat responses.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appDescription">Description (optional)</Label>
            <Input
              id="appDescription"
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="e.g., AI-powered knowledge assistant"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Prompt Section */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>
            Configure the system prompt for your assistant. The appropriate language version
            is automatically selected based on the user&apos;s message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Tabs */}
          <div className="flex gap-1 border-b">
            <button
              type="button"
              onClick={() => setActiveTab("en")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "en"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("zh")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "zh"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Chinese (中文)
            </button>
          </div>

          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {activeTab === "en" ? "English Prompt" : "Chinese Prompt (中文提示词)"}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResetPrompt(activeTab)}
                disabled={!defaultPrompts}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset to Default
              </Button>
            </div>
            <Textarea
              value={activeTab === "en" ? systemPromptEn : systemPromptZh}
              onChange={(e) => {
                if (activeTab === "en") {
                  setSystemPromptEn(e.target.value);
                } else {
                  setSystemPromptZh(e.target.value);
                }
              }}
              placeholder={
                activeTab === "en"
                  ? "Enter your system prompt in English..."
                  : "输入中文系统提示词..."
              }
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Supported variables: <code className="bg-muted px-1 rounded">{"{{app_name}}"}</code>
              {" - "}will be replaced with your assistant name.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          size="lg"
        >
          {updateSettings.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

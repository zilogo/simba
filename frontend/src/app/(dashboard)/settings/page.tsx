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
import { useTranslation } from "react-i18next";

type PromptLanguage = "en" | "zh";

export default function SettingsPage() {
  const { t } = useTranslation();
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
        setError(t("settings.loginRequired"));
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
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">
          {t("settings.description")}
        </p>
      </div>

      {/* Branding Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.branding")}</CardTitle>
          <CardDescription>
            {t("settings.brandingDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName">{t("settings.assistantName")}</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder={t("settings.assistantNamePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("settings.assistantNameHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appDescription">{t("settings.descriptionLabel")}</Label>
            <Input
              id="appDescription"
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder={t("settings.descriptionPlaceholder")}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Prompt Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.systemPrompt")}</CardTitle>
          <CardDescription>
            {t("settings.systemPromptDesc")}
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
              {t("settings.english")}
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
              {t("settings.chinese")}
            </button>
          </div>

          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {activeTab === "en" ? t("settings.englishPrompt") : t("settings.chinesePrompt")}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResetPrompt(activeTab)}
                disabled={!defaultPrompts}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {t("settings.resetToDefault")}
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
                  ? t("settings.englishPlaceholder")
                  : t("settings.chinesePlaceholder")
              }
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {t("settings.variablesHint")}
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
              {t("settings.saving")}
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              {t("settings.saved")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t("settings.saveChanges")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

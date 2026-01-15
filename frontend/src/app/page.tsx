"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-center text-5xl font-bold tracking-tight sm:text-6xl">
          {t("home.welcome")}{" "}
          <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Simba
          </span>
        </h1>

        <p className="max-w-2xl text-center text-lg text-muted-foreground">
          {t("home.description")}
        </p>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {t("home.getStarted")}
          </Link>
          <Link
            href="https://github.com/GitHamza0206/simba"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {t("home.viewGithub")}
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <FeatureCard
            title={t("home.fastResponses")}
            description={t("home.fastResponsesDesc")}
          />
          <FeatureCard
            title={t("home.accurateAnswers")}
            description={t("home.accurateAnswersDesc")}
          />
          <FeatureCard
            title={t("home.easyIntegration")}
            description={t("home.easyIntegrationDesc")}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

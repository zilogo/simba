"use client";

import { useTranslation } from "react-i18next";
import { BarChart3, TrendingUp, Clock, ThumbsUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyticsOverview, useEvalMetrics } from "@/hooks";

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: evalMetrics, isLoading: evalsLoading } = useEvalMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
        <p className="text-muted-foreground">
          {t("analytics.descriptionAlt")}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title={t("analytics.avgResponseTimeLabel")}
              value={formatResponseTime(overview?.avg_response_time_ms.value ?? 0)}
              description={t("analytics.targetResponseTime")}
              icon={Clock}
              trend={formatChange(overview?.avg_response_time_ms.change ?? 0)}
              trendUp={false}
            />
            <MetricCard
              title={t("analytics.resolutionRateLabel")}
              value={formatPercent(overview?.resolution_rate.value ?? 0)}
              description={t("analytics.resolutionRateDesc")}
              icon={TrendingUp}
              trend={formatChange(overview?.resolution_rate.change ?? 0)}
              trendUp={(overview?.resolution_rate.change ?? 0) > 0}
            />
            <MetricCard
              title={t("analytics.userSatisfactionLabel")}
              value={formatSatisfaction(overview?.user_satisfaction.value ?? 0)}
              description={t("analytics.userSatisfactionDesc")}
              icon={ThumbsUp}
              trend={formatChange(overview?.user_satisfaction.change ?? 0)}
              trendUp={(overview?.user_satisfaction.change ?? 0) > 0}
            />
            <MetricCard
              title={t("analytics.totalConversationsLabel")}
              value={formatNumber(overview?.total_conversations.value ?? 0)}
              description={t("analytics.thisPeriod", { period: overview?.total_conversations.period ?? "week" })}
              icon={BarChart3}
              trend={formatChange(overview?.total_conversations.change ?? 0)}
              trendUp={(overview?.total_conversations.change ?? 0) > 0}
            />
          </>
        )}
      </div>

      {/* Charts placeholder */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.responseQuality")}</CardTitle>
            <CardDescription>{t("analytics.evaluationScoresDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {t("analytics.chartPlaceholder")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.queryVolume")}</CardTitle>
            <CardDescription>{t("analytics.conversationsPerDay")}</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {t("analytics.chartPlaceholder")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Eval Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.evaluationMetrics")}</CardTitle>
          <CardDescription>{t("analytics.evaluationMetricsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {evalsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <EvalMetric label={t("analytics.relevanceScore")} value={evalMetrics?.relevance_score ?? 0} />
              <EvalMetric label={t("analytics.accuracyScore")} value={evalMetrics?.accuracy_score ?? 0} />
              <EvalMetric label={t("analytics.completenessScore")} value={evalMetrics?.completeness_score ?? 0} />
              <EvalMetric label={t("analytics.citationScore")} value={evalMetrics?.citation_score ?? 0} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatResponseTime(ms: number): string {
  if (ms === 0) return "—";
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatPercent(value: number): string {
  if (value === 0) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatSatisfaction(value: number): string {
  if (value === 0) return "—";
  return `${value.toFixed(1)}/5`;
}

function formatNumber(value: number): string {
  if (value === 0) return "—";
  return value.toLocaleString();
}

function formatChange(change: number): string {
  if (change === 0) return "—";
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${Math.round(change)}%`;
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 text-xs">
          <span className={trend === "—" ? "text-muted-foreground" : trendUp ? "text-green-600" : "text-red-600"}>
            {trend}
          </span>
          <span className="text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EvalMetric({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100);
  const displayValue = value === 0 ? "—" : `${percentage}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{displayValue}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

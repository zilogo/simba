"use client";

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, TrendingUp, Users } from "lucide-react";

export default function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.description")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("dashboard.totalDocuments")}
          value="24"
          description={t("dashboard.fromLastWeek", { count: 2 })}
          icon={FileText}
        />
        <StatsCard
          title={t("dashboard.conversations")}
          value="1,234"
          description={t("dashboard.today", { count: 180 })}
          icon={MessageSquare}
        />
        <StatsCard
          title={t("dashboard.resolutionRate")}
          value="89%"
          description={t("dashboard.fromLastMonth", { percent: 2.5 })}
          icon={TrendingUp}
        />
        <StatsCard
          title={t("dashboard.activeUsers")}
          value="573"
          description={t("dashboard.currentlyOnline")}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.recentConversations")}</CardTitle>
            <CardDescription>{t("dashboard.latestInquiries")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("dashboard.noConversationsYet")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.documentStatus")}</CardTitle>
            <CardDescription>{t("dashboard.knowledgeBaseOverview")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("dashboard.noDocumentsYet")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

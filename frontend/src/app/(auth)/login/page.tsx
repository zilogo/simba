"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { signIn } from "@/lib/auth-client";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await signIn.email({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setError(error.message || t("auth.invalidCredentials"));
        setIsLoading(false);
        return;
      }

      router.push(ROUTES.HOME);
      router.refresh();
    } catch {
      setError(t("auth.unexpectedError"));
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("auth.welcomeBack")}</CardTitle>
        <CardDescription>{t("auth.signInDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.signIn")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              {t("auth.signUp")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

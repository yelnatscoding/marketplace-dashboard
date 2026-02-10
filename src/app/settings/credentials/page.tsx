"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { KeyRound, ExternalLink, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface Credential {
  id: number;
  platform: string;
  isConnected: boolean;
  userId: string | null;
  tokenExpiresAt: number | null;
  updatedAt: number;
}

function CredentialsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [bmToken, setBmToken] = useState("");

  const success = searchParams.get("success");
  const error = searchParams.get("error");

  const { data: credentials = [], isLoading } = useQuery<Credential[]>({
    queryKey: ["credentials"],
    queryFn: () => fetch("/api/settings/credentials").then((r) => r.json()),
  });

  const saveBmToken = useMutation({
    mutationFn: () =>
      fetch("/api/settings/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "backmarket", token: bmToken }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      setBmToken("");
      toast.success("BackMarket token saved");
    },
  });

  const disconnect = useMutation({
    mutationFn: (platform: string) =>
      fetch(`/api/settings/credentials?platform=${platform}`, {
        method: "DELETE",
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast.success("Disconnected");
    },
  });

  const mlCred = credentials.find((c) => c.platform === "mercadolibre");
  const bmCred = credentials.find((c) => c.platform === "backmarket");

  function getExpiryStatus(expiresAt: number | null) {
    if (!expiresAt) return null;
    const now = Date.now();
    const daysLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: "Expired", variant: "destructive" as const };
    if (daysLeft < 7) return { label: `${daysLeft}d left`, variant: "destructive" as const };
    if (daysLeft < 30) return { label: `${daysLeft}d left`, variant: "secondary" as const };
    return { label: `${daysLeft}d left`, variant: "secondary" as const };
  }

  return (
    <div>
      <PageHeader
        title="API Credentials"
        description="Connect your marketplace accounts"
      />

      {success === "ml_connected" && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          Mercado Libre connected successfully!
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5" />
          Connection failed: {error.replace(/_/g, " ")}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Mercado Libre */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                  <span className="text-lg font-bold text-yellow-700">ML</span>
                </div>
                <div>
                  <CardTitle className="text-base">Mercado Libre</CardTitle>
                  <CardDescription>OAuth2 authentication</CardDescription>
                </div>
              </div>
              {mlCred?.isConnected ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {mlCred?.isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono">{mlCred.userId}</span>
                </div>
                {mlCred.tokenExpiresAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Token expires</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {(() => {
                        const status = getExpiryStatus(mlCred.tokenExpiresAt);
                        return status ? (
                          <Badge variant={status.variant}>{status.label}</Badge>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={() => disconnect.mutate("mercadolibre")}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button asChild className="w-full">
                <a href="/api/auth/mercadolibre">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect Mercado Libre
                </a>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* BackMarket */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <span className="text-lg font-bold text-blue-700">BM</span>
                </div>
                <div>
                  <CardTitle className="text-base">BackMarket</CardTitle>
                  <CardDescription>API token authentication</CardDescription>
                </div>
              </div>
              {bmCred?.isConnected ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {bmCred?.isConnected ? (
              <div className="space-y-3">
                {bmCred.tokenExpiresAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Token expires</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {(() => {
                        const status = getExpiryStatus(bmCred.tokenExpiresAt);
                        return status ? (
                          <Badge variant={status.variant}>{status.label}</Badge>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={() => disconnect.mutate("backmarket")}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Paste your BackMarket API token"
                  value={bmToken}
                  onChange={(e) => setBmToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Generate from BackMarket Back Office. Valid for 90 days.
                </p>
                <Button
                  className="w-full"
                  onClick={() => saveBmToken.mutate()}
                  disabled={!bmToken || saveBmToken.isPending}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  {saveBmToken.isPending ? "Saving..." : "Save Token"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CredentialsPage() {
  return (
    <Suspense>
      <CredentialsContent />
    </Suspense>
  );
}

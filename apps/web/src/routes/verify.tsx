import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Loader2,
  XCircle,
} from "lucide-react";
import { useParams } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVerifyContract } from "@/lib/api/contracts";

const STATUS_LABEL: Record<string, string> = {
  draft: "Qoralama",
  generated: "PDF tayyorlangan",
  active: "Aktiv",
  expired: "Muddati o'tgan",
  revoked: "Bekor qilingan",
};

const TEMPLATE_LABEL: Record<string, string> = {
  "4_plus_2": "4+2 amaliyoti",
  pedagogical: "Pedagogik amaliyot",
  qualifying: "Malakaviy amaliyot",
  internship_production: "Ishlab chiqarish",
  partnership: "Dastlabki hamkorlik",
};

export function VerifyPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isPending, error } = useVerifyContract(token ?? null);

  return (
    <div className="min-h-screen bg-muted/30 py-10">
      <div className="container max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileCheck2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Shartnoma tekshiruvi</h1>
            <p className="text-sm text-muted-foreground">CHDPU amaliyot platformasi</p>
          </div>
        </div>

        {isPending && (
          <Card>
            <CardContent className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Shartnoma topilmadi</AlertTitle>
            <AlertDescription>
              QR kod noto'g'ri yoki shartnoma o'chirilgan bo'lishi mumkin.
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-mono text-lg">{data.number}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {TEMPLATE_LABEL[data.template_ref] ?? data.template_ref}
                  </p>
                </div>
                {data.is_valid ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Yaroqli
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Yaroqsiz
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-[140px_1fr] gap-y-1.5">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">
                  {STATUS_LABEL[data.status] ?? data.status}
                </dd>
                <dt className="text-muted-foreground">Tashkilot</dt>
                <dd>{data.organization_name}</dd>
                <dt className="text-muted-foreground">Amaliyot turi</dt>
                <dd>{data.practice_type_name}</dd>
                <dt className="text-muted-foreground">Boshlanish</dt>
                <dd>{new Date(data.start_date).toLocaleDateString("uz-UZ")}</dd>
                <dt className="text-muted-foreground">Tugash</dt>
                <dd>{new Date(data.end_date).toLocaleDateString("uz-UZ")}</dd>
                <dt className="text-muted-foreground">Talabalar soni</dt>
                <dd>{data.students_count}</dd>
                {data.generated_at && (
                  <>
                    <dt className="text-muted-foreground">PDF yaratildi</dt>
                    <dd className="text-xs">
                      {new Date(data.generated_at).toLocaleString("uz-UZ")}
                    </dd>
                  </>
                )}
                {data.signed_at_org && (
                  <>
                    <dt className="text-muted-foreground">Imzolangan</dt>
                    <dd className="text-xs">
                      {new Date(data.signed_at_org).toLocaleString("uz-UZ")}
                    </dd>
                  </>
                )}
              </div>

              {data.revoked_reason && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Bekor qilingan</AlertTitle>
                  <AlertDescription>{data.revoked_reason}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Chirchiq Davlat Pedagogika Universiteti · Amaliyot bo'limi
        </p>
      </div>
    </div>
  );
}

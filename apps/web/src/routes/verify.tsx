import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileDown,
  Loader2,
  RotateCw,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateLocale } from "@/i18n";
import { useVerifyContract, VerifyContractError } from "@/lib/api/contracts";

const STATUS_LABEL: Record<string, string> = {
  draft: "verify.status.draft",
  generated: "verify.status.generated",
  active: "verify.status.active",
  expired: "verify.status.expired",
  revoked: "verify.status.revoked",
};

const TEMPLATE_LABEL: Record<string, string> = {
  "4_plus_2": "verify.template.fourPlusTwo",
  pedagogical: "verify.template.pedagogical",
  qualifying: "verify.template.qualifying",
  internship_production: "verify.template.internshipProduction",
  partnership: "verify.template.partnership",
};

export function VerifyPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const { data, isPending, error, refetch, isFetching } = useVerifyContract(token ?? null);
  // Faqat 404 "shartnoma topilmadi"; tarmoq/server xatosida tashqi tekshiruvchiga
  // "yaroqsiz" degan noto'g'ri xulosa emas, "qayta urinib ko'ring" ko'rsatiladi.
  const notFound = error instanceof VerifyContractError ? error.notFound : !!error;

  const statusKey = data ? STATUS_LABEL[data.status] : undefined;
  const templateKey = data ? TEMPLATE_LABEL[data.template_ref] : undefined;

  return (
    <div className="min-h-screen bg-muted/30 py-6 sm:py-10">
      <div className="container max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileCheck2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{t("verify.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("verify.subtitle")}</p>
          </div>
        </div>

        {isPending && (
          <Card>
            <CardContent className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {error && notFound && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>{t("verify.notFoundTitle")}</AlertTitle>
            <AlertDescription>
              {t("verify.notFoundDesc")}
            </AlertDescription>
          </Alert>
        )}

        {error && !notFound && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("verify.checkFailedTitle")}</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{t("verify.checkFailed")}</p>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
                {t("verify.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-mono text-lg">{data.number}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {templateKey ? t(templateKey) : data.template_ref}
                    </p>
                  </div>
                  {data.is_valid ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("verify.valid")}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {t("verify.invalid")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <dl className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-3 gap-y-1.5 break-words">
                  <dt className="text-muted-foreground">{t("common.status")}</dt>
                  <dd className="font-medium">
                    {statusKey ? t(statusKey) : data.status}
                  </dd>
                  <dt className="text-muted-foreground">{t("common.organization")}</dt>
                  <dd>{data.organization_name}</dd>
                  <dt className="text-muted-foreground">{t("common.practiceType")}</dt>
                  <dd>{data.practice_type_name}</dd>
                  <dt className="text-muted-foreground">{t("verify.startDate")}</dt>
                  <dd>{new Date(data.start_date).toLocaleDateString(dateLocale())}</dd>
                  <dt className="text-muted-foreground">{t("verify.endDate")}</dt>
                  <dd>{new Date(data.end_date).toLocaleDateString(dateLocale())}</dd>
                  <dt className="text-muted-foreground">{t("verify.studentsCount")}</dt>
                  <dd>{data.students_count}</dd>
                  {data.generated_at && (
                    <>
                      <dt className="text-muted-foreground">{t("verify.generatedAt")}</dt>
                      <dd className="text-xs">
                        {new Date(data.generated_at).toLocaleString(dateLocale())}
                      </dd>
                    </>
                  )}
                  {data.signed_at_org && (
                    <>
                      <dt className="text-muted-foreground">{t("verify.signedAt")}</dt>
                      <dd className="text-xs">
                        {new Date(data.signed_at_org).toLocaleString(dateLocale())}
                      </dd>
                    </>
                  )}
                </dl>

                {data.revoked_reason && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t("verify.revokedTitle")}</AlertTitle>
                    <AlertDescription>{data.revoked_reason}</AlertDescription>
                  </Alert>
                )}

                {data.pdf_url && (
                  <div className="pt-3 border-t flex flex-col sm:flex-row gap-2">
                    <Button asChild className="w-full gap-2" variant="default">
                      <a href={data.pdf_url} download>
                        <FileDown className="h-4 w-4" />
                        {t("verify.downloadPdf")}
                      </a>
                    </Button>
                    <Button asChild className="w-full gap-2" variant="outline">
                      <a href={data.pdf_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        {t("verify.openFullscreen")}
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {data.pdf_url && (
              <Card className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/40 border-b">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("verify.officialCopy")}
                  </p>
                </CardHeader>
                <div className="w-full h-[70dvh] max-h-[600px] min-h-[320px] bg-muted/10">
                  <iframe
                    src={data.pdf_url}
                    className="w-full h-full border-0"
                    title={t("verify.officialCopy")}
                  />
                </div>
              </Card>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("verify.footer")}
        </p>
      </div>
    </div>
  );
}

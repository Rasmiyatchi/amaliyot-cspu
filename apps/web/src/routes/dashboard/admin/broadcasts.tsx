import { History, Loader2, Megaphone, Send, Users, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { GroupSearchSelect } from "@/components/admin/assignments/group-search-select";
import { StudentSearchSelect } from "@/components/admin/assignments/student-search-select";
import { ListPagination } from "@/components/admin/students/list-pagination";
import { formatTashkentDateTime } from "@/components/attendance/attendance-date-utils";
import { describeRequestError } from "@/components/attendance/request-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { dateLocale } from "@/i18n";
import { useAllFaculties } from "@/lib/api/academic";
import {
  BROADCAST_AUDIENCES,
  useBroadcast,
  useBroadcasts,
  usePreviewBroadcast,
  useSendBroadcast,
  type Broadcast,
  type BroadcastAudience,
  type BroadcastCreate,
} from "@/lib/api/broadcasts";
import { useStudent } from "@/lib/api/students";
import { useAuthStore } from "@/stores/auth";

const PAGE_SIZE = 15;
const SUBJECT_MAX = 200;
const BODY_MAX = 4000;
const TEMPLATES = ["maintenance", "outage", "news"] as const;

function audienceText(
  b: Pick<Broadcast, "audience" | "faculty_name" | "group_name">,
  t: (k: string) => string,
) {
  const base = t(`broadcasts.audience.${b.audience}`);
  const extra = b.group_name ?? b.faculty_name;
  return extra ? `${base}: ${extra}` : base;
}

/** Tanlangan talaba chipi — ismni kesh/so'rov orqali ko'rsatadi. */
function StudentChip({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { t } = useTranslation();
  const { data } = useStudent(id);
  return (
    <Badge variant="secondary" className="gap-1 pr-1 font-normal">
      {data ? `${data.full_name} (${data.username})` : "…"}
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-0.5 hover:bg-muted"
        aria-label={t("broadcasts.removeStudent")}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

function ComposeCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const facultyLocked = user?.role === "admin" && !!user.faculty_id;
  const faculties = useAllFaculties();
  const preview = usePreviewBroadcast();
  const send = useSendBroadcast();

  const [audience, setAudience] = useState<BroadcastAudience>("all_students");
  const [facultyId, setFacultyId] = useState(user?.faculty_id ?? "");
  const [groupId, setGroupId] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirm, setConfirm] = useState<{ count: number; payload: BroadcastCreate } | null>(null);

  const targetMissing =
    (audience === "faculty" && !facultyId) ||
    (audience === "group" && !groupId) ||
    (audience === "students" && studentIds.length === 0);
  const subjectInvalid = subject.trim().length < 3;
  const bodyInvalid = body.trim().length < 3;

  const payload = (): BroadcastCreate => ({
    audience,
    subject: subject.trim(),
    body: body.trim(),
    ...(audience === "faculty" ? { faculty_id: facultyId } : {}),
    ...(audience === "group" ? { group_id: groupId } : {}),
    ...(audience === "students" ? { student_ids: studentIds } : {}),
  });

  const handleReview = async () => {
    setTouched(true);
    if (targetMissing || subjectInvalid || bodyInvalid) return;
    try {
      const data = payload();
      const res = await preview.mutateAsync(data);
      if (res.recipients_count === 0) {
        toast.error(t("broadcasts.noRecipients"));
        return;
      }
      setConfirm({ count: res.recipients_count, payload: data });
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const handleSend = async () => {
    if (!confirm) return;
    try {
      const res = await send.mutateAsync(confirm.payload);
      toast.success(t("broadcasts.sent", { n: res.recipients_count }));
      setConfirm(null);
      setSubject("");
      setBody("");
      setStudentIds([]);
      setTouched(false);
    } catch (e) {
      toast.error(describeRequestError(e, t));
    }
  };

  const applyTemplate = (key: (typeof TEMPLATES)[number]) => {
    setSubject(t(`broadcasts.templates.${key}.subject`));
    setBody(t(`broadcasts.templates.${key}.body`));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-primary" />
          {t("broadcasts.composeTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("broadcasts.audienceLabel")}</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as BroadcastAudience)}>
              <SelectTrigger aria-label={t("broadcasts.audienceLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BROADCAST_AUDIENCES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(`broadcasts.audience.${a}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {facultyLocked && audience !== "group" && audience !== "students" && (
              <p className="text-xs text-muted-foreground">{t("broadcasts.facultyScopedHint")}</p>
            )}
          </div>
          <div className="space-y-1.5">
            {audience === "faculty" && (
              <>
                <Label>{t("common.faculty")}</Label>
                <Select
                  value={facultyId || undefined}
                  onValueChange={setFacultyId}
                  disabled={facultyLocked}
                >
                  <SelectTrigger aria-label={t("common.faculty")}>
                    <SelectValue placeholder={t("reassign.pickFaculty")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {(faculties.data ?? []).map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {audience === "group" && (
              <>
                <Label>{t("common.group")}</Label>
                <GroupSearchSelect
                  value={groupId}
                  onValueChange={setGroupId}
                  placeholder={t("reassign.pickGroup")}
                />
              </>
            )}
            {audience === "students" && (
              <>
                <Label>{t("common.students")}</Label>
                {/* Tanlangan talaba ro'yxatga qo'shiladi, tanlov maydoni bo'sh qoladi */}
                <StudentSearchSelect
                  value=""
                  onValueChange={(id) => {
                    if (id) setStudentIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                  }}
                  placeholder={t("broadcasts.addStudent")}
                />
              </>
            )}
          </div>
        </div>
        {audience === "students" && studentIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {studentIds.map((id) => (
              <StudentChip
                key={id}
                id={id}
                onRemove={() => setStudentIds((prev) => prev.filter((x) => x !== id))}
              />
            ))}
          </div>
        )}
        {touched && targetMissing && (
          <p className="text-xs text-destructive">{t("broadcasts.targetRequired")}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("broadcasts.templatesLabel")}</span>
          {TEMPLATES.map((k) => (
            <Button
              key={k}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => applyTemplate(k)}
            >
              {t(`broadcasts.templates.${k}.label`)}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bc-subject">{t("broadcasts.subject")}</Label>
          <Input
            id="bc-subject"
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
            aria-invalid={touched && subjectInvalid}
          />
          {touched && subjectInvalid && (
            <p className="text-xs text-destructive">{t("broadcasts.subjectRequired")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bc-body">{t("broadcasts.body")}</Label>
            <span className="text-xs text-muted-foreground">
              {body.length}/{BODY_MAX}
            </span>
          </div>
          <Textarea
            id="bc-body"
            rows={6}
            value={body}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            aria-invalid={touched && bodyInvalid}
          />
          {touched && bodyInvalid && (
            <p className="text-xs text-destructive">{t("broadcasts.bodyRequired")}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => void handleReview()}
            disabled={preview.isPending}
            className="w-full sm:w-auto"
          >
            {preview.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("broadcasts.review")}
          </Button>
        </div>
      </CardContent>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && !send.isPending && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("broadcasts.confirmTitle")}</DialogTitle>
            <DialogDescription>
              {confirm && t("broadcasts.confirmText", { n: confirm.count })}
            </DialogDescription>
          </DialogHeader>
          {confirm && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {t(`broadcasts.audience.${confirm.payload.audience}`)}
              </div>
              <div className="font-semibold">{confirm.payload.subject}</div>
              <p className="line-clamp-6 whitespace-pre-wrap text-muted-foreground">
                {confirm.payload.body}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={send.isPending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void handleSend()} disabled={send.isPending}>
              {send.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("broadcasts.send", { n: confirm?.count ?? 0 })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BroadcastDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, isPending } = useBroadcast(id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6">{data?.subject ?? t("common.loading")}</DialogTitle>
          {data && (
            <DialogDescription>
              {formatTashkentDateTime(data.sent_at, dateLocale())} · {data.sender_name ?? "—"}
            </DialogDescription>
          )}
        </DialogHeader>
        {isPending && <Skeleton className="h-24 w-full" />}
        {data && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{audienceText(data, t)}</Badge>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                {t("broadcasts.recipients", { n: data.recipients_count })}
              </Badge>
            </div>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{data.body}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Ommaviy xabarlar: yuborish (talabalar, fakultet, guruh, tanlanganlar, supervizorlar) va tarix. */
export function BroadcastsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const { data, isPending } = useBroadcasts(page, PAGE_SIZE);
  const openId = searchParams.get("id");

  const setOpenId = (id: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set("id", id);
        else next.delete("id");
        return next;
      },
      { replace: true },
    );

  return (
    <div className="container max-w-5xl py-4 sm:py-8">
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">{t("broadcasts.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("broadcasts.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-4">
        <ComposeCard />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              {t("broadcasts.historyTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0 sm:p-0">
            {isPending && (
              <div className="space-y-2 p-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}
            {data && data.items.length === 0 && (
              <EmptyState
                icon={Megaphone}
                title={t("broadcasts.emptyTitle")}
                description={t("broadcasts.emptyDescription")}
                accent="muted"
                compact
              />
            )}
            {data && data.items.length > 0 && (
              <ul className="divide-y divide-border border-t border-border">
                {data.items.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(b.id)}
                      className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{b.subject}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {audienceText(b, t)} · {b.sender_name ?? "—"}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="font-normal">
                          {t("broadcasts.recipients", { n: b.recipients_count })}
                        </Badge>
                        {formatTashkentDateTime(b.sent_at, dateLocale())}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {data && (
              <ListPagination
                className="px-4 pb-4"
                page={page}
                pageSize={PAGE_SIZE}
                total={data.total}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {openId && <BroadcastDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { dateLocale } from "@/i18n";
import { useInquiry, useSendMessage } from "@/lib/api/inquiries";
import { cn } from "@/lib/utils";
import type { UUID } from "@/lib/api/types";

/** Murojaat tredi — xabarlar ro'yxati + javob yozish. */
export function InquiryThread({ inquiryId }: { inquiryId: UUID }) {
  const { t } = useTranslation();
  const { data, isPending } = useInquiry(inquiryId);
  const send = useSendMessage();
  const [text, setText] = useState("");

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await send.mutateAsync({ id: inquiryId, body: text.trim() });
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("inquiryThread.sendFailed"));
    }
  };

  if (isPending) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-lg border border-border p-3">
        {data?.messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.from_admin ? "justify-start" : "justify-end")}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                m.from_admin
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground",
              )}
            >
              <div className="mb-0.5 text-[10px] opacity-70">
                {m.from_admin
                  ? t("inquiryThread.fromAdmin")
                  : t("inquiryThread.fromYou")}{" "}
                · {new Date(m.created_at).toLocaleString(dateLocale())}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          </div>
        ))}
        {data && data.messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {t("inquiryThread.noMessages")}
          </p>
        )}
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("inquiryThread.messagePlaceholder")}
          rows={2}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSend();
          }}
        />
        <Button onClick={handleSend} disabled={send.isPending || !text.trim()}>
          {send.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

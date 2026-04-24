import { HTTPError } from "ky";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateLessonAnalysis,
  useUpdateLessonAnalysis,
} from "@/lib/api/tasks";
import type { LessonAnalysis, UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  assignmentId: UUID;
  analysis: LessonAnalysis | null;
  onClose: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LessonAnalysisFormDialog({
  open,
  assignmentId,
  analysis,
  onClose,
}: Props) {
  const [date, setDate] = useState(today());
  const [subject, setSubject] = useState("");
  const [teacher, setTeacher] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [quarter, setQuarter] = useState("1");
  const [analysisMd, setAnalysisMd] = useState("");

  const create = useCreateLessonAnalysis();
  const update = useUpdateLessonAnalysis();

  const isEdit = !!analysis;
  const isApproved = analysis?.status === "approved";

  useEffect(() => {
    if (open) {
      if (analysis) {
        setDate(analysis.date.slice(0, 10));
        setSubject(analysis.subject);
        setTeacher(analysis.teacher_name);
        setGradeLevel(analysis.grade_level ?? "");
        setQuarter(String(analysis.quarter));
        setAnalysisMd(analysis.analysis_md);
      } else {
        setDate(today());
        setSubject("");
        setTeacher("");
        setGradeLevel("");
        setQuarter("1");
        setAnalysisMd("");
      }
    }
  }, [open, analysis]);

  const handleSave = async () => {
    if (subject.trim().length < 1 || teacher.trim().length < 1) {
      toast.error("Fan va o'qituvchi majburiy");
      return;
    }
    if (analysisMd.trim().length < 3) {
      toast.error("Tahlil matni juda qisqa");
      return;
    }

    const base = {
      date: new Date(date + "T12:00:00Z").toISOString(),
      subject: subject.trim(),
      teacher_name: teacher.trim(),
      grade_level: gradeLevel.trim() || null,
      quarter: Number(quarter),
      analysis_md: analysisMd.trim(),
    };

    try {
      if (isEdit && analysis) {
        await update.mutateAsync({ id: analysis.id, data: base });
        toast.success("Yangilandi");
      } else {
        await create.mutateAsync({ assignmentId, data: base });
        toast.success("Yuborildi");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Dars tahlilini tahrirlash" : "Yangi dars tahlili"}
          </DialogTitle>
          <DialogDescription>
            Fan o'qituvchisining darsini kuzatib, tahlil qiling
          </DialogDescription>
        </DialogHeader>

        {analysis?.status === "rejected" && analysis.rejection_reason && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="font-medium">Rad etilgan</div>
              <div className="mt-1 text-sm">{analysis.rejection_reason}</div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="analysis-date">Sana</Label>
            <Input
              id="analysis-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isApproved}
            />
          </div>
          <div>
            <Label htmlFor="analysis-quarter">Chorak</Label>
            <Select value={quarter} onValueChange={setQuarter} disabled={isApproved}>
              <SelectTrigger id="analysis-quarter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1-chorak</SelectItem>
                <SelectItem value="2">2-chorak</SelectItem>
                <SelectItem value="3">3-chorak</SelectItem>
                <SelectItem value="4">4-chorak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="analysis-subject">Fan</Label>
            <Input
              id="analysis-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isApproved}
              placeholder="Biologiya"
            />
          </div>
          <div>
            <Label htmlFor="analysis-teacher">O'qituvchi</Label>
            <Input
              id="analysis-teacher"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              disabled={isApproved}
              placeholder="Karimova Oygul"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="analysis-grade">Sinf (ixtiyoriy)</Label>
            <Input
              id="analysis-grade"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              disabled={isApproved}
              placeholder="7-B"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="analysis-md">Tahlil matni</Label>
          <textarea
            id="analysis-md"
            value={analysisMd}
            onChange={(e) => setAnalysisMd(e.target.value)}
            disabled={isApproved}
            rows={10}
            className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm disabled:opacity-60"
            placeholder="Dars metodikasi, ishlatilgan texnologiyalar, kuchli va zaif tomonlari..."
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Yopish
          </Button>
          {!isApproved && (
            <Button onClick={handleSave} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              {isEdit ? "Saqlash" : "Yuborish"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

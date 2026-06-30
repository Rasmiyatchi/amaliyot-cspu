import { HTTPError } from "ky";
import { Info, Loader2 } from "lucide-react";
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
import { useFaculties, useDirections, useGroups } from "@/lib/api/academic";
import {
  useCreateStudent,
  useUpdateStudent,
  type StudentCreatePayload,
} from "@/lib/api/students";
import type { Student, UUID } from "@/lib/api/types";

type Props = {
  open: boolean;
  /** Mavjud talaba — bo'lsa edit, bo'lmasa create. */
  student?: Student | null;
  onClose: () => void;
};

type FormState = {
  hemis_id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  phone: string;
  gender: "" | "male" | "female";
  region: string;
  district: string;
  faculty_id: string;
  direction_id: string;
  group_id: string;
};

const EMPTY: FormState = {
  hemis_id: "",
  first_name: "",
  last_name: "",
  middle_name: "",
  email: "",
  phone: "",
  gender: "",
  region: "",
  district: "",
  faculty_id: "",
  direction_id: "",
  group_id: "",
};

export function StudentFormDialog({ open, student, onClose }: Props) {
  const isEdit = !!student;
  const [form, setForm] = useState<FormState>(EMPTY);
  const create = useCreateStudent();
  const update = useUpdateStudent();

  // Cascade: fakultet → yo'nalish → guruh
  const facultiesQ = useFaculties(1, 100);
  const directionsQ = useDirections(form.faculty_id || undefined, 1, 200);
  const groupsQ = useGroups({ directionId: (form.direction_id || undefined) as UUID | undefined }, 1, 200);

  // Init form when student prop changes
  useEffect(() => {
    if (!open) return;
    if (student) {
      setForm({
        hemis_id: student.hemis_id,
        first_name: student.first_name,
        last_name: student.last_name,
        middle_name: student.middle_name ?? "",
        email: student.email ?? "",
        phone: student.phone ?? "",
        gender: (student.gender as "male" | "female") ?? "",
        region: student.region ?? "",
        district: student.district ?? "",
        faculty_id: student.faculty_id ?? "",
        direction_id: student.direction_id ?? "",
        group_id: student.group_id ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, student]);

  const set = (k: keyof FormState, v: string) =>
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === "faculty_id") {
        next.direction_id = "";
        next.group_id = "";
      }
      if (k === "direction_id") {
        next.group_id = "";
      }
      return next;
    });

  const validate = (): string | null => {
    if (!form.first_name.trim()) return "Ism majburiy";
    if (!form.last_name.trim()) return "Familiya majburiy";
    if (!form.group_id) return "Guruh tanlang";
    if (!isEdit) {
      if (!form.hemis_id.trim()) return "Talaba ID majburiy";
      if (form.hemis_id.length < 4) return "Talaba ID kamida 4 ta belgi";
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      if (isEdit && student) {
        await update.mutateAsync({
          id: student.id,
          data: {
            first_name: form.first_name,
            last_name: form.last_name,
            middle_name: form.middle_name || null,
            email: form.email || null,
            phone: form.phone || null,
            gender: form.gender || null,
            region: form.region || null,
            district: form.district || null,
            group_id: (form.group_id || undefined) as UUID | undefined,
          },
        });
        toast.success("Talaba ma'lumotlari yangilandi");
      } else {
        const payload: StudentCreatePayload = {
          hemis_id: form.hemis_id.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          middle_name: form.middle_name.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          gender: form.gender || null,
          region: form.region.trim() || null,
          district: form.district.trim() || null,
          group_id: form.group_id as UUID,
        };
        const created = await create.mutateAsync(payload);
        toast.success(
          `Talaba qo'shildi. Login = parol: ${created.username} (birinchi kirishda almashtiriladi)`,
          { duration: 12000 },
        );
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof HTTPError ? e.message : "Xatolik");
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Talabani tahrirlash" : "Yangi talaba"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ma'lumotlarni yangilang. Login/parolni alohida tugmadan o'zgartiring."
              : "Yakka talaba qo'shish formi (Excel import alternativasi)."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {!isEdit && (
            <>
              <div className="sm:col-span-2">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Login va parol avtomatik generatsiya qilinadi (12 raqamli, "2500" bilan
                    boshlanadi). Talaba birinchi kirishda parolni o'zgartiradi.
                  </AlertDescription>
                </Alert>
              </div>
              <div className="sm:col-span-2">
                <Label>Talaba ID *</Label>
                <Input
                  value={form.hemis_id}
                  onChange={(e) => set("hemis_id", e.target.value)}
                  placeholder="354231100489 (Amaliyot ID yoki o'z raqamingiz)"
                />
              </div>
            </>
          )}

          {/* F.I.SH. */}
          <div>
            <Label>Familiya *</Label>
            <Input
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </div>
          <div>
            <Label>Ism *</Label>
            <Input
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Otasining ismi</Label>
            <Input
              value={form.middle_name}
              onChange={(e) => set("middle_name", e.target.value)}
            />
          </div>

          {/* Akademik */}
          <div>
            <Label>Fakultet *</Label>
            <Select value={form.faculty_id} onValueChange={(v) => set("faculty_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tanlang" />
              </SelectTrigger>
              <SelectContent>
                {(facultiesQ.data?.items ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Yo'nalish *</Label>
            <Select
              value={form.direction_id}
              onValueChange={(v) => set("direction_id", v)}
              disabled={!form.faculty_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.faculty_id ? "Tanlang" : "Avval fakultet"} />
              </SelectTrigger>
              <SelectContent>
                {(directionsQ.data?.items ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Guruh *</Label>
            <Select
              value={form.group_id}
              onValueChange={(v) => set("group_id", v)}
              disabled={!form.direction_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.direction_id ? "Tanlang" : "Avval yo'nalish"} />
              </SelectTrigger>
              <SelectContent>
                {(groupsQ.data?.items ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} (kurs {g.course})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aloqa */}
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+998..."
            />
          </div>

          {/* Shaxsiy */}
          <div>
            <Label>Jins</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Erkak</SelectItem>
                <SelectItem value="female">Ayol</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Viloyat</Label>
            <Input
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
            />
          </div>
          <div>
            <Label>Tuman</Label>
            <Input
              value={form.district}
              onChange={(e) => set("district", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Bekor
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Saqlash" : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

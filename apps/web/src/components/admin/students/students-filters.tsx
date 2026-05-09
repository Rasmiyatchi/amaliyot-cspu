import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDirections, useFaculties } from "@/lib/api/academic";
import type { StudentFilters } from "@/lib/api/students";
import type { StudentStatus } from "@/lib/api/types";

type Props = {
  filters: StudentFilters;
  onChange: (f: StudentFilters) => void;
};

const ALL_VALUE = "__all__";

export function StudentsFilters({ filters, onChange }: Props) {
  const faculties = useFaculties();
  const directions = useDirections(filters.faculty_id);
  const [searchInput, setSearchInput] = useState(filters.search ?? "");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== (filters.search ?? "")) {
        onChange({ ...filters, search: searchInput || undefined });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const hasFilters =
    !!filters.search ||
    !!filters.faculty_id ||
    !!filters.direction_id ||
    filters.course !== undefined ||
    !!filters.status;

  const set = (patch: Partial<StudentFilters>) => onChange({ ...filters, ...patch });
  const clear = () => {
    setSearchInput("");
    onChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Qidiruv (F.I.SH., Talaba ID)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-8"
        />
      </div>

      <Select
        value={filters.faculty_id ?? ALL_VALUE}
        onValueChange={(v) =>
          set({ faculty_id: v === ALL_VALUE ? undefined : v, direction_id: undefined })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Fakultet" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Barcha fakultetlar</SelectItem>
          {(faculties.data?.items ?? []).map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.direction_id ?? ALL_VALUE}
        onValueChange={(v) => set({ direction_id: v === ALL_VALUE ? undefined : v })}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Yo'nalish" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Barcha yo'nalishlar</SelectItem>
          {(directions.data?.items ?? []).map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.code} — {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.course !== undefined ? String(filters.course) : ALL_VALUE}
        onValueChange={(v) => set({ course: v === ALL_VALUE ? undefined : Number(v) })}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Kurs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Barcha kurs</SelectItem>
          {[1, 2, 3, 4].map((c) => (
            <SelectItem key={c} value={String(c)}>
              {c}-kurs
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status ?? ALL_VALUE}
        onValueChange={(v) =>
          set({ status: v === ALL_VALUE ? undefined : (v as StudentStatus) })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Barcha status</SelectItem>
          <SelectItem value="studying">O'qiyapti</SelectItem>
          <SelectItem value="graduated">Bitirgan</SelectItem>
          <SelectItem value="academic_leave">Akademik ta'til</SelectItem>
          <SelectItem value="expelled">Haydalgan</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <X className="h-4 w-4" />
          Tozalash
        </Button>
      )}
    </div>
  );
}

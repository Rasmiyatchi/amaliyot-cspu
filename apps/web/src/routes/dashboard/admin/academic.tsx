import { School } from "lucide-react";

import { AcademicYearList } from "@/components/admin/academic/academic-year-list";
import { DirectionList } from "@/components/admin/academic/direction-list";
import { FacultyList } from "@/components/admin/academic/faculty-list";
import { GroupList } from "@/components/admin/academic/group-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AcademicPage() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <School className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Akademik tuzilma</h1>
          <p className="text-sm text-muted-foreground">
            Fakultetlar, yo'nalishlar, guruhlar va o'quv yillari
          </p>
        </div>
      </div>

      <Tabs defaultValue="faculties">
        <TabsList>
          <TabsTrigger value="faculties">Fakultetlar</TabsTrigger>
          <TabsTrigger value="directions">Yo'nalishlar</TabsTrigger>
          <TabsTrigger value="groups">Guruhlar</TabsTrigger>
          <TabsTrigger value="academic-years">O'quv yillari</TabsTrigger>
        </TabsList>

        <TabsContent value="faculties">
          <FacultyList />
        </TabsContent>
        <TabsContent value="directions">
          <DirectionList />
        </TabsContent>
        <TabsContent value="groups">
          <GroupList />
        </TabsContent>
        <TabsContent value="academic-years">
          <AcademicYearList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

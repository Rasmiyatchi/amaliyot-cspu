import { Building2 } from "lucide-react";

import { AreasList } from "@/components/admin/objects/areas-list";
import { OrganizationsList } from "@/components/admin/objects/organizations-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ObjectsPage() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Obyektlar</h1>
          <p className="text-sm text-muted-foreground">
            Amaliyot tashkilotlari (shartnomali) va hududlar
          </p>
        </div>
      </div>

      <Tabs defaultValue="organizations">
        <TabsList>
          <TabsTrigger value="organizations">Tashkilotlar</TabsTrigger>
          <TabsTrigger value="areas">Hududlar</TabsTrigger>
        </TabsList>
        <TabsContent value="organizations">
          <OrganizationsList />
        </TabsContent>
        <TabsContent value="areas">
          <AreasList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

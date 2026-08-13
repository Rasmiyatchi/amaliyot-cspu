import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Upload,
  Save,
  Loader2,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Variable,
  Plus,
  Minus,
  Rows3,
  Columns3,
  Trash2,
} from "lucide-react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapUnderline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Table as TiptapTable } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TiptapLink from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── API Helpers ─────────────────────────────────────────
interface TemplateData {
  id: string;
  name: string;
  html_content: string | null;
  placeholders: string[];
}

const fetchTemplate = async (id: string): Promise<TemplateData> =>
  api.get(`v1/contract-templates/${id}`).json();

const fetchVariables = async (): Promise<{key: string, label: string}[]> => 
  api.get("v1/contract-templates/variables").json();

const updateTemplate = async (
  id: string,
  data: { name?: string; html_content?: string }
) => api.patch(`v1/contract-templates/${id}`, { json: data }).json();

const createHtmlTemplate = async (data: {
  name: string;
  html_content: string;
}) => {
  const fd = new FormData();
  fd.append("name", data.name);
  fd.append("html_content", data.html_content);
  return api.post("v1/contract-templates/create-html", { body: fd }).json();
};

// ─── Main Page Component ─────────────────────────────────

export function ContractTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templateName, setTemplateName] = useState("");
  const [, setInitialHtml] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Fetch existing template
  const { data, isLoading } = useQuery({
    queryKey: ["contract-template", id],
    queryFn: () => fetchTemplate(id!),
    enabled: !isNew && !!id,
  });

  // Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      TiptapUnderline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapTable.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TiptapLink.configure({ openOnClick: false }),
      TiptapImage,
      TextStyle,
      FontFamily,
      Placeholder.configure({ placeholder: "Shartnoma matnini yozing…" }),
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    editorProps: {
      attributes: {
        class: "contract-editor-content",
      },
    },
  });

  // Fetch dynamic variables
  const { data: variables = [] } = useQuery({
    queryKey: ["contract-template-variables"],
    queryFn: fetchVariables,
  });

  // Load data into editor
  useEffect(() => {
    if (data && editor && !loaded) {
      setTemplateName(data.name);
      const content = data.html_content || "";
      setInitialHtml(content);
      editor.commands.setContent(content);
      setLoaded(true);
    }
  }, [data, editor, loaded]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!templateName.trim()) {
        throw new Error("Shartnoma nomini kiriting!");
      }
      const html = editor?.getHTML() || "";
      if (!html || html === "<p></p>") {
        throw new Error("Shartnoma matni bo'sh!");
      }

      if (isNew) {
        return createHtmlTemplate({ name: templateName.trim(), html_content: html });
      }
      return updateTemplate(id!, { name: templateName.trim(), html_content: html });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Shablon muvaffaqiyatli saqlandi!");
      if (isNew) navigate("/admin/contract-templates");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Word upload handler
  const handleWordUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!/\.(docx?)$/i.test(file.name)) {
        toast.error("Faqat .doc yoki .docx fayl yuklang!");
        return;
      }
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (result.value && editor) {
          editor.commands.setContent(result.value);
          if (!templateName) {
            setTemplateName(file.name.replace(/\.(docx?)$/i, ""));
          }
          toast.success("Word fayl yuklandi va tahrirlash uchun tayyor!");
          if (result.messages.length > 0) {
            console.warn("Mammoth warnings:", result.messages);
          }
        }
      } catch (err) {
        toast.error("Word faylni o'qishda xatolik yuz berdi!");
        console.error(err);
      }
      // reset input
      e.target.value = "";
    },
    [editor, templateName]
  );

  // Insert variable
  const insertVariable = useCallback(
    (varKey: string) => {
      if (editor) {
        editor.chain().focus().insertContent(`{${varKey}}`).run();
      }
    },
    [editor]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen flex-col bg-muted/30">
        {/* ─── Top Bar ─── */}
        <div className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b bg-background px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/contract-templates")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Shartnoma nomi..."
              className="w-[300px] text-lg font-semibold border-dashed"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Word yuklash
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".doc,.docx"
              className="hidden"
              onChange={handleWordUpload}
            />
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Saqlash
            </Button>
          </div>
        </div>

        {/* ─── Toolbar ─── */}
        {editor && (
          <div className="sticky top-[65px] z-40 flex flex-wrap items-center gap-1 border-b bg-background px-4 py-2 shadow-sm">
            {/* Undo / Redo */}
            <ToolbarButton
              icon={<Undo className="h-4 w-4" />}
              tooltip="Qaytarish (Undo)"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              icon={<Redo className="h-4 w-4" />}
              tooltip="Takrorlash (Redo)"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            />

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarButton
              icon={<Heading1 className="h-4 w-4" />}
              tooltip="Sarlavha 1"
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarButton
              icon={<Heading2 className="h-4 w-4" />}
              tooltip="Sarlavha 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
              icon={<Heading3 className="h-4 w-4" />}
              tooltip="Sarlavha 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            />
            <ToolbarButton
              icon={<Type className="h-4 w-4" />}
              tooltip="Oddiy matn"
              active={editor.isActive("paragraph")}
              onClick={() => editor.chain().focus().setParagraph().run()}
            />

            <ToolbarDivider />

            {/* Font Family */}
            <Select
              value={editor.getAttributes("textStyle").fontFamily || "default"}
              onValueChange={(v) =>
                v === "default"
                  ? editor.chain().focus().unsetFontFamily().run()
                  : editor.chain().focus().setFontFamily(v).run()
              }
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Shrift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Standart</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
              </SelectContent>
            </Select>

            <ToolbarDivider />

            {/* Bold, Italic, Underline, Strikethrough */}
            <ToolbarButton
              icon={<Bold className="h-4 w-4" />}
              tooltip="Qalin (Bold)"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              icon={<Italic className="h-4 w-4" />}
              tooltip="Kursiv (Italic)"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              icon={<UnderlineIcon className="h-4 w-4" />}
              tooltip="Tagiga chizish"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
              icon={<Strikethrough className="h-4 w-4" />}
              tooltip="Chizilgan"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />

            <ToolbarDivider />

            {/* Text Align */}
            <ToolbarButton
              icon={<AlignLeft className="h-4 w-4" />}
              tooltip="Chapga tekislash"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            />
            <ToolbarButton
              icon={<AlignCenter className="h-4 w-4" />}
              tooltip="Markazga tekislash"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            />
            <ToolbarButton
              icon={<AlignRight className="h-4 w-4" />}
              tooltip="O'ngga tekislash"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            />
            <ToolbarButton
              icon={<AlignJustify className="h-4 w-4" />}
              tooltip="Ikki tomonga tekislash"
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            />

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton
              icon={<List className="h-4 w-4" />}
              tooltip="Belgili ro'yxat"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              icon={<ListOrdered className="h-4 w-4" />}
              tooltip="Raqamli ro'yxat"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />

            <ToolbarDivider />

            {/* Table */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <TableIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                      .run()
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Jadval qo'shish (3×3)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  disabled={!editor.can().addRowAfter()}
                >
                  <Rows3 className="mr-2 h-4 w-4" /> Qator qo'shish
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  disabled={!editor.can().addColumnAfter()}
                >
                  <Columns3 className="mr-2 h-4 w-4" /> Ustun qo'shish
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  disabled={!editor.can().deleteRow()}
                >
                  <Minus className="mr-2 h-4 w-4" /> Qatorni o'chirish
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  disabled={!editor.can().deleteColumn()}
                >
                  <Minus className="mr-2 h-4 w-4" /> Ustunni o'chirish
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  disabled={!editor.can().deleteTable()}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Jadvalni o'chirish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Link */}
            <ToolbarButton
              icon={<LinkIcon className="h-4 w-4" />}
              tooltip="Havola"
              active={editor.isActive("link")}
              onClick={() => {
                const url = window.prompt("URL:");
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
            />

            {/* Image */}
            <ToolbarButton
              icon={<ImageIcon className="h-4 w-4" />}
              tooltip="Rasm"
              onClick={() => {
                const url = window.prompt("Rasm URL:");
                if (url) editor.chain().focus().setImage({ src: url }).run();
              }}
            />

            <ToolbarDivider />

            {/* Variables Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-medium">
                  <Variable className="h-4 w-4" />
                  O'zgaruvchilar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                {variables.map((v) => (
                  <DropdownMenuItem
                    key={v.key}
                    onClick={() => insertVariable(v.key)}
                  >
                    <code className="mr-2 text-xs text-primary">
                      {v.key}
                    </code>
                    <span className="text-muted-foreground">{v.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* ─── A4 Editor Area ─── */}
        <div className="flex-1 overflow-y-auto bg-muted/50 px-4 py-8">
          <div className="mx-auto" style={{ maxWidth: "210mm" }}>
            <div
              className="contract-a4-page"
              style={{
                backgroundColor: "white",
                minHeight: "297mm",
                padding: "25mm 20mm",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                borderRadius: "4px",
              }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Toolbar Helpers ───────────────────────────────────

function ToolbarButton({
  icon,
  tooltip,
  active,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  tooltip: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="sm"
          className={`h-8 w-8 p-0 ${active ? "bg-primary/10 text-primary" : ""}`}
          disabled={disabled}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

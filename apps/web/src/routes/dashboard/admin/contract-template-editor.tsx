import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Indent,
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
  Check,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { useEditor, EditorContent, Extension, type Editor } from "@tiptap/react";
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
import Placeholder from "@tiptap/extension-placeholder";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

// Maxsus buyruqlar TipTap'ning `Commands` interfeysiga qo'shiladi — `editor.chain()`
// ularni tipli taniydi (tip o'chirish shart emas). @tiptap/react core'ni qayta eksport qiladi.
declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
    paragraphSpacing: {
      setMarginTop: (marginTop: string | null) => ReturnType;
      setMarginBottom: (marginBottom: string | null) => ReturnType;
    };
    textIndent: {
      setTextIndent: (textIndent: string) => ReturnType;
      unsetTextIndent: () => ReturnType;
    };
  }
}

type BlockAttrs = Record<string, unknown>;

/** Xat boshi (abzas) chekinishi — rasmiy hujjatlardagi standart */
const FIRST_LINE_INDENT = "1.25cm";

/** Havola/rasm manzili — faqat xavfsiz sxemalar (javascript: va h.k. emas) */
const LINK_URL_RE = /^(https?:\/\/|mailto:)/i;
const IMAGE_URL_RE = /^(https?:\/\/|data:image\/)/i;

/** Inline `style` qiymati — faqat qator (string) bo'lsa */
function styleValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

// ─── Custom Line Height Extension ──────────────────────
type LineHeightOptions = { types: string[]; defaultLineHeight: string };

const LineHeight = Extension.create<LineHeightOptions>({
  name: "lineHeight",
  addOptions() {
    return {
      types: ["paragraph", "heading", "listItem"],
      defaultLineHeight: "1.15",
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
            renderHTML: (attributes: BlockAttrs) => {
              const value = styleValue(attributes.lineHeight);
              return value ? { style: `line-height: ${value}` } : {};
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ commands }) =>
          this.options.types.some((type) => commands.updateAttributes(type, { lineHeight })),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.some((type) => commands.resetAttributes(type, "lineHeight")),
    };
  },
});

// ─── Custom Paragraph Spacing Extension ──────────────────────
type ParagraphSpacingOptions = { types: string[] };

const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: "paragraphSpacing",
  addOptions() {
    return {
      types: ["paragraph", "heading"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          marginTop: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginTop || null,
            renderHTML: (attributes: BlockAttrs) => {
              const value = styleValue(attributes.marginTop);
              return value ? { style: `margin-top: ${value}` } : {};
            },
          },
          marginBottom: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginBottom || null,
            renderHTML: (attributes: BlockAttrs) => {
              const value = styleValue(attributes.marginBottom);
              return value ? { style: `margin-bottom: ${value}` } : {};
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setMarginTop:
        (marginTop) =>
        ({ commands }) =>
          this.options.types.some((type) => commands.updateAttributes(type, { marginTop })),
      setMarginBottom:
        (marginBottom) =>
        ({ commands }) =>
          this.options.types.some((type) => commands.updateAttributes(type, { marginBottom })),
    };
  },
});

// ─── Custom Text Indent Extension ──────────────────────
type TextIndentOptions = { types: string[]; defaultIndent: string };

const TextIndent = Extension.create<TextIndentOptions>({
  name: "textIndent",
  addOptions() {
    return {
      types: ["paragraph", "heading"],
      defaultIndent: "0",
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textIndent: {
            default: this.options.defaultIndent,
            parseHTML: (element: HTMLElement) =>
              element.style.textIndent || this.options.defaultIndent,
            renderHTML: (attributes: BlockAttrs) => {
              const value = styleValue(attributes.textIndent);
              if (!value || value === this.options.defaultIndent) return {};
              return { style: `text-indent: ${value}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextIndent:
        (textIndent) =>
        ({ commands }) =>
          this.options.types.some((type) => commands.updateAttributes(type, { textIndent })),
      unsetTextIndent:
        () =>
        ({ commands }) =>
          this.options.types.some((type) => commands.resetAttributes(type, "textIndent")),
    };
  },
});


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
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templateName, setTemplateName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [urlDialog, setUrlDialog] = useState<"link" | "image" | null>(null);

  // Fetch existing template
  // Muharrir har doim serverdagi eng so'nggi nusxani ochadi: keshdagi eski HTML ustidan
  // saqlash yangi versiyani jimgina o'chirib yuborardi.
  const {
    data,
    isLoading,
    isFetching,
    error: loadError,
  } = useQuery({
    queryKey: ["contract-template", id],
    queryFn: () => fetchTemplate(id ?? ""),
    enabled: !isNew && !!id,
    staleTime: 0,
    refetchOnMount: "always",
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
      LineHeight,
      ParagraphSpacing,
      TextIndent,
      Placeholder.configure({ placeholder: t("adminContractEditor.editorPlaceholder") }),
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
    if (data && editor && !loaded && !isFetching) {
      setTemplateName(data.name);
      editor.commands.setContent(data.html_content || "");
      setLoaded(true);
    }
  }, [data, editor, loaded, isFetching]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!templateName.trim()) {
        throw new Error(t("adminContractEditor.nameRequired"));
      }
      const html = editor?.getHTML() || "";
      if (!html || html === "<p></p>") {
        throw new Error(t("adminContractEditor.emptyContent"));
      }

      const name = templateName.trim();
      if (isNew) {
        await createHtmlTemplate({ name, html_content: html });
      } else {
        await updateTemplate(id ?? "", { name, html_content: html });
      }
      return { name, html };
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      // Qayta ochilganda saqlangan matn ko'rinsin (eski kesh emas)
      if (!isNew) {
        queryClient.setQueryData<TemplateData>(["contract-template", id], (old) =>
          old ? { ...old, name: saved.name, html_content: saved.html } : old,
        );
      }
      toast.success(t("adminContractEditor.saved"));
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
        toast.error(t("adminContractEditor.docOnly"));
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
          toast.success(t("adminContractEditor.wordLoaded"));
        }
      } catch {
        toast.error(t("adminContractEditor.wordReadError"));
      }
      // reset input
      e.target.value = "";
    },
    [editor, templateName, t]
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

  const handleUrlConfirm = (value: string) => {
    if (!editor || !urlDialog) return;
    const url = value.trim();
    const allowed = urlDialog === "link" ? LINK_URL_RE.test(url) : IMAGE_URL_RE.test(url);
    if (!allowed) {
      toast.error(t("adminContractEditor.invalidUrl"));
      return;
    }
    if (urlDialog === "link") editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().setImage({ src: url }).run();
    setUrlDialog(null);
  };

  // Server nusxasi muharrirga yuklanguncha (yangilanish so'rovi ham) — yozish boshlanmasin
  if (isLoading || (!isNew && !loaded && !loadError)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Shablon topilmasa/yuklanmasa — bo'sh tahrirlovchi ko'rsatilmaydi (saqlash xato PATCH yuborardi)
  if (loadError) {
    return (
      <div className="container max-w-xl space-y-4 py-10">
        <Alert variant="destructive">
          <AlertDescription>{loadError.message}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate("/admin/contract-templates")}>
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen flex-col bg-muted/30">
        {/* ─── Top Bar ─── */}
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/contract-templates")}
              aria-label={t("common.back")}
              title={t("common.back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t("adminContractEditor.namePlaceholder")}
              aria-label={t("adminContractEditor.namePlaceholder")}
              className="min-w-0 max-w-[300px] flex-1 border-dashed text-lg font-semibold"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("adminContractEditor.uploadWord")}
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
              {t("common.save")}
            </Button>
          </div>
        </div>

        {/* ─── Toolbar ─── */}
        {editor && (
          <div className="sticky top-[65px] z-40 flex flex-wrap items-center gap-1 border-b bg-background px-4 py-2 shadow-sm">
            {/* Undo / Redo */}
            <ToolbarButton
              icon={<Undo className="h-4 w-4" />}
              tooltip={t("adminContractEditor.undo")}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              icon={<Redo className="h-4 w-4" />}
              tooltip={t("adminContractEditor.redo")}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            />

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarButton
              icon={<Heading1 className="h-4 w-4" />}
              tooltip={t("adminContractEditor.heading1")}
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarButton
              icon={<Heading2 className="h-4 w-4" />}
              tooltip={t("adminContractEditor.heading2")}
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
              icon={<Heading3 className="h-4 w-4" />}
              tooltip={t("adminContractEditor.heading3")}
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            />
            <ToolbarButton
              icon={<Type className="h-4 w-4" />}
              tooltip={t("adminContractEditor.paragraph")}
              active={editor.isActive("paragraph")}
              onClick={() => editor.chain().focus().setParagraph().run()}
            />

            <ToolbarDivider />

            {/* Line Spacing & Paragraph Spacing Dropdown */}
            <LineSpacingDropdown editor={editor} />

            <ToolbarDivider />

            {/* Bold, Italic, Underline, Strikethrough */}
            <ToolbarButton
              icon={<Bold className="h-4 w-4" />}
              tooltip={t("adminContractEditor.bold")}
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              icon={<Italic className="h-4 w-4" />}
              tooltip={t("adminContractEditor.italic")}
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              icon={<UnderlineIcon className="h-4 w-4" />}
              tooltip={t("adminContractEditor.underline")}
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            />
            <ToolbarButton
              icon={<Strikethrough className="h-4 w-4" />}
              tooltip={t("adminContractEditor.strikethrough")}
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            />

            <ToolbarDivider />

            {/* Text Align */}
            <ToolbarButton
              icon={<AlignLeft className="h-4 w-4" />}
              tooltip={t("adminContractEditor.alignLeft")}
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            />
            <ToolbarButton
              icon={<AlignCenter className="h-4 w-4" />}
              tooltip={t("adminContractEditor.alignCenter")}
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            />
            <ToolbarButton
              icon={<AlignRight className="h-4 w-4" />}
              tooltip={t("adminContractEditor.alignRight")}
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            />
            <ToolbarButton
              icon={<AlignJustify className="h-4 w-4" />}
              tooltip={t("adminContractEditor.alignJustify")}
              active={editor.isActive({ textAlign: "justify" })}
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            />
            <ToolbarButton
              icon={<Indent className="h-4 w-4" />}
              tooltip={t("adminContractEditor.indent")}
              active={editor.getAttributes("paragraph").textIndent === FIRST_LINE_INDENT}
              onClick={() => {
                if (editor.getAttributes("paragraph").textIndent === FIRST_LINE_INDENT) {
                  editor.chain().focus().unsetTextIndent().run();
                } else {
                  editor.chain().focus().setTextIndent(FIRST_LINE_INDENT).run();
                }
              }}
            />

            <ToolbarDivider />

            {/* Lists */}
            <ToolbarButton
              icon={<List className="h-4 w-4" />}
              tooltip={t("adminContractEditor.bulletList")}
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              icon={<ListOrdered className="h-4 w-4" />}
              tooltip={t("adminContractEditor.orderedList")}
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />

            <ToolbarDivider />

            {/* Table */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  aria-label={t("adminContractEditor.table")}
                  title={t("adminContractEditor.table")}
                >
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
                  <Plus className="mr-2 h-4 w-4" /> {t("adminContractEditor.tableInsert")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  disabled={!editor.can().addRowAfter()}
                >
                  <Rows3 className="mr-2 h-4 w-4" /> {t("adminContractEditor.rowAdd")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  disabled={!editor.can().addColumnAfter()}
                >
                  <Columns3 className="mr-2 h-4 w-4" /> {t("adminContractEditor.colAdd")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  disabled={!editor.can().deleteRow()}
                >
                  <Minus className="mr-2 h-4 w-4" /> {t("adminContractEditor.rowDelete")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  disabled={!editor.can().deleteColumn()}
                >
                  <Minus className="mr-2 h-4 w-4" /> {t("adminContractEditor.colDelete")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  disabled={!editor.can().deleteTable()}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> {t("adminContractEditor.tableDelete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Link */}
            <ToolbarButton
              icon={<LinkIcon className="h-4 w-4" />}
              tooltip={t("adminContractEditor.link")}
              active={editor.isActive("link")}
              onClick={() => setUrlDialog("link")}
            />

            {/* Image */}
            <ToolbarButton
              icon={<ImageIcon className="h-4 w-4" />}
              tooltip={t("adminContractEditor.image")}
              onClick={() => setUrlDialog("image")}
            />

            <ToolbarDivider />

            {/* Variables Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs font-medium">
                  <Variable className="h-4 w-4" />
                  {t("adminContractEditor.variables")}
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
                fontFamily: '"Times New Roman", Times, serif',
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

      <PromptDialog
        open={urlDialog !== null}
        title={urlDialog === "image" ? t("adminContractEditor.image") : t("adminContractEditor.link")}
        label={
          urlDialog === "image"
            ? t("adminContractEditor.imageUrlPrompt")
            : t("adminContractEditor.linkUrlPrompt")
        }
        placeholder="https://"
        rows={2}
        // Rasm uchun data:image/... URL juda uzun bo'ladi (backend tashqi URL'larni taqiqlaydi,
        // shuning uchun muhr/logotip faqat shunday qo'shiladi) — 2000 belgida kesilmasin
        maxLength={urlDialog === "image" ? 5_000_000 : 2000}
        confirmText={t("common.add")}
        onConfirm={handleUrlConfirm}
        onClose={() => setUrlDialog(null)}
      />
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

// ─── Line Spacing & Paragraph Spacing Dropdown ─────────

function LineSpacingDropdown({ editor }: { editor: Editor }) {
  const { t } = useTranslation();

  const paragraphAttrs: BlockAttrs = editor.getAttributes("paragraph");
  const headingAttrs: BlockAttrs = editor.getAttributes("heading");

  const currentLineHeight =
    styleValue(paragraphAttrs.lineHeight) ?? styleValue(headingAttrs.lineHeight) ?? "1.15";
  const currentMarginTop =
    styleValue(paragraphAttrs.marginTop) ?? styleValue(headingAttrs.marginTop);
  const currentMarginBottom =
    styleValue(paragraphAttrs.marginBottom) ?? styleValue(headingAttrs.marginBottom);

  const hasSpaceBefore = Boolean(currentMarginTop && currentMarginTop !== "0px" && currentMarginTop !== "0");
  const hasSpaceAfter = Boolean(
    currentMarginBottom
      ? currentMarginBottom !== "0px" && currentMarginBottom !== "0" && currentMarginBottom !== "2px"
      : false
  );

  const setLineHeight = (val: string) => {
    editor.chain().focus().setLineHeight(val).run();
  };

  const toggleSpaceBefore = () => {
    editor.chain().focus().setMarginTop(hasSpaceBefore ? "0px" : "10px").run();
  };

  const toggleSpaceAfter = () => {
    editor.chain().focus().setMarginBottom(hasSpaceAfter ? "0px" : "10px").run();
  };

  const lineHeights = ["1.0", "1.15", "1.5", "2.0", "2.5", "3.0"];

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs font-normal">
              <LineHeightIcon className="h-4 w-4" />
              <span className="font-mono text-xs">{currentLineHeight}</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {t("adminContractEditor.lineSpacing")}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-60">
        {lineHeights.map((lh) => {
          const isActive = currentLineHeight === lh;
          return (
            <DropdownMenuItem
              key={lh}
              onClick={() => setLineHeight(lh)}
              className="flex items-center justify-between text-xs cursor-pointer"
            >
              <span>{lh}</span>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleSpaceBefore} className="flex items-center gap-2 text-xs cursor-pointer">
          <SpaceBeforeIcon className="h-4 w-4 text-muted-foreground" />
          <span>
            {hasSpaceBefore
              ? t("adminContractEditor.removeSpaceBefore")
              : t("adminContractEditor.addSpaceBefore")}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={toggleSpaceAfter} className="flex items-center gap-2 text-xs cursor-pointer">
          <SpaceAfterIcon className="h-4 w-4 text-muted-foreground" />
          <span>
            {hasSpaceAfter
              ? t("adminContractEditor.removeSpaceAfter")
              : t("adminContractEditor.addSpaceAfter")}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LineHeightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 6H9" />
      <path d="M21 12H9" />
      <path d="M21 18H9" />
      <path d="M3 7l2-2 2 2" />
      <path d="M5 5v14" />
      <path d="M3 17l2 2 2-2" />
    </svg>
  );
}

function SpaceBeforeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v6" />
      <path d="M9 6l3 3 3-3" />
      <path d="M4 14h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function SpaceAfterIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M4 10h16" />
      <path d="M12 15v6" />
      <path d="M9 18l3 3 3-3" />
    </svg>
  );
}

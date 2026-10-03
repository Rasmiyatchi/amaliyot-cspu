import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItemProps {
  id: string;
  number: string;
  question: string;
  answer: string;
}

export function Accordion({ items }: { items: AccordionItemProps[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const baseId = useId();

  return (
    <div className="faq-wrap space-y-2">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const triggerId = `${baseId}-${item.id}-trigger`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id} className="faq-item border-b border-slate-200 dark:border-slate-800">
            <h3>
              <button
                type="button"
                id={triggerId}
                className="faq-trigger flex w-full items-center justify-between gap-3 py-6 text-left font-extrabold text-slate-900 dark:text-slate-100"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="flex min-w-0 items-center">
                  <span className="mr-5 text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {item.number}
                  </span>
                  <span className="text-base sm:text-lg">{item.question}</span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              </button>
            </h3>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="faq-content pb-6 pl-9 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

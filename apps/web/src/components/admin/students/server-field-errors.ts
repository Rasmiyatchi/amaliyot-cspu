import { HTTPError } from "ky";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

/** 422 javobidagi `field_errors` ({"maydon": "xabar"}); bo'lmasa bo'sh obyekt. */
async function readServerFieldErrors(error: unknown): Promise<Record<string, string>> {
  if (!(error instanceof HTTPError)) return {};
  try {
    const body = (await error.response.clone().json()) as { field_errors?: unknown };
    const raw = body.field_errors;
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === "string" && value) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Server validatsiya xatolarini mos forma maydonlariga yozadi (maydon ostida ko'rinadi).
 * Kalit "body.email" ko'rinishida kelsa oxirgi qismi olinadi. Qaytaradi: nechta maydon belgilandi.
 */
export async function applyServerFieldErrors<TIn extends FieldValues, TOut extends FieldValues>(
  form: UseFormReturn<TIn, unknown, TOut>,
  error: unknown,
): Promise<number> {
  const fieldErrors = await readServerFieldErrors(error);
  const known = new Set(Object.keys(form.getValues()));
  let applied = 0;
  for (const [key, message] of Object.entries(fieldErrors)) {
    const name = key.split(".").pop();
    if (!name || !known.has(name)) continue;
    form.setError(name as Path<TIn>, { type: "server", message }, { shouldFocus: applied === 0 });
    applied += 1;
  }
  return applied;
}

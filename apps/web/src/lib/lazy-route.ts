import type { ComponentType } from "react";

/**
 * Route darajasidagi code-splitting.
 *
 * Ilgari butun ilova (admin shablon muharriri, DOCX o'qigich, xarita va h.k.) bitta
 * ~2.5 MB JS faylda edi — talaba telefoni "Keldim" sahifasini ochish uchun ham hammasini
 * yuklab, parse qilardi. Endi har bir bo'lim (admin, supervizor, talaba) kerak bo'lganda yuklanadi.
 *
 * Deploy'dan keyin eski tab ochiq qolsa, uning chunk fayllari serverda bo'lmaydi
 * (nomida hash bor). Bunday holatda sahifa BIR MARTA avtomatik yangilanadi; ikkinchi
 * marta ham topilmasa — oddiy xato ekrani ko'rsatiladi (cheksiz qayta yuklash bo'lmaydi).
 */

const RELOAD_FLAG = "chdpu-chunk-reload";

export function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS/i.test(
    text,
  );
}

function readFlag(): boolean {
  try {
    return sessionStorage.getItem(RELOAD_FLAG) === "1";
  } catch {
    return true; // storage yo'q — xavfsiz tomonga: qayta yuklamaymiz
  }
}

function writeFlag(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(RELOAD_FLAG, "1");
    else sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* storage yo'q */
  }
}

/** `lazy: lazyPage(() => import("@/routes/x"), "XPage")` — nomlangan eksportni route komponenti qiladi. */
export function lazyPage<M>(load: () => Promise<M>, exportName: keyof M) {
  return async (): Promise<{ Component: ComponentType }> => {
    try {
      const mod = await load();
      writeFlag(false);
      return { Component: mod[exportName] as ComponentType };
    } catch (error) {
      if (isChunkLoadError(error) && !readFlag()) {
        writeFlag(true);
        window.location.reload();
        // Sahifa yangilanguncha hech narsa ko'rsatmaymiz
        return new Promise<never>(() => {});
      }
      throw error;
    }
  };
}

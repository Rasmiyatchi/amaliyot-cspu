import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class'larini birlashtirib, ziddiyatli'larini tozalaydi. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function downloadFile(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

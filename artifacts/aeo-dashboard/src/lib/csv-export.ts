/**
 * Tiny CSV serializer + browser download trigger. Intentionally hand-rolled
 * to avoid pulling in a CSV library for one feature.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Quote if contains comma, quote, or newline. Escape inner quotes by doubling.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: ReadonlyArray<T>,
  columns: ReadonlyArray<{ key: keyof T & string; header: string }>,
): string {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c.key])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csvContent: string): void {
  // Prepend UTF-8 BOM so Excel opens it with correct encoding.
  const blob = new Blob([`﻿${csvContent}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function isoDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

import * as XLSX from "xlsx";
import { detectTarget, normalizeHeader, type ImportTarget } from "./fields";

export interface ColumnMapping {
  column: string;
  target: ImportTarget;
}

export interface RawSheet {
  name: string;
  columns: ColumnMapping[];
  headers: string[];
  rows: Record<string, string>[];
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: RawSheet[];
}

function isCsv(fileName: string): boolean {
  return /\.csv$/i.test(fileName);
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "";
    return String(value);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

// Normalize a header and make duplicates unique within a sheet.
function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((raw) => {
    const base = raw.trim() || `column_${headers.indexOf(raw) + 1}`;
    const norm = normalizeHeader(base) || base;
    const count = seen.get(norm) ?? 0;
    seen.set(norm, count + 1);
    return count === 0 ? base : `${base}_${count}`;
  });
}

export function parseFileBuffer(buffer: ArrayBuffer | Uint8Array, fileName: string): ParsedWorkbook {
  const wb = isCsv(fileName)
    ? XLSX.read(stripBom(Buffer.from(buffer as ArrayBuffer).toString("utf8")), { type: "string" })
    : XLSX.read(buffer as ArrayBuffer, { type: "buffer" });

  const sheets: RawSheet[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
    const rows = matrix.map((r) => r.map(cellToString));
    // Drop fully empty rows.
    const nonEmpty = rows.filter((r) => r.some((c) => c !== ""));

    if (nonEmpty.length === 0) {
      sheets.push({ name: sheetName, columns: [], headers: [], rows: [] });
      continue;
    }

    const headerRow = nonEmpty[0];
    const headers = dedupeHeaders(headerRow);
    const columns: ColumnMapping[] = headers.map((h) => ({
      column: h,
      target: detectTarget(h),
    }));

    const dataRows: Record<string, string>[] = nonEmpty.slice(1).map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = r[i] ?? "";
      });
      return obj;
    });

    sheets.push({ name: sheetName, columns, headers, rows: dataRows });
  }

  return { fileName, sheets };
}

export function applyMappingToSheet(
  sheet: RawSheet,
  mapping: Record<string, ImportTarget>
): { rows: Record<string, string>[]; targetsByColumn: Record<string, ImportTarget> } {
  const targetsByColumn: Record<string, ImportTarget> = {};
  for (const col of sheet.headers) {
    targetsByColumn[col] = mapping[col] ?? "ignore";
  }
  return { rows: sheet.rows, targetsByColumn };
}

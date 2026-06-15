import * as XLSX from "xlsx";

export type SheetDef = {
  name: string;
  rows: Record<string, unknown>[];
};

export function buildWorkbook(sheets: SheetDef[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.rows.length ? sheet.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function downloadSheetAsExcel(rows: Record<string, unknown>[], sheetName: string, filename: string) {
  const wb = buildWorkbook([{ name: sheetName, rows }]);
  downloadWorkbook(wb, filename);
}

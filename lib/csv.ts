const formulaPrefix = /^[=+\-@\t\r]/;

export function safeCsvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (formulaPrefix.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function createCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(safeCsvCell).join(",")).join("\r\n");
}

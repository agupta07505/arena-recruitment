import { describe, expect, it } from "vitest";
import { createCsv, safeCsvCell } from "@/lib/csv";

describe("CSV protection", () => {
  it("quotes cells and neutralizes spreadsheet formulas", () => {
    expect(safeCsvCell("=HYPERLINK(\"bad\")")).toBe("\"'=HYPERLINK(\"\"bad\"\")\"");
    expect(safeCsvCell("Sam, Arena")).toBe('"Sam, Arena"');
  });
  it("creates a Windows-compatible CSV", () => {
    expect(createCsv(["Name"], [["A"], ["B"]])).toBe('"Name"\r\n"A"\r\n"B"');
  });
});

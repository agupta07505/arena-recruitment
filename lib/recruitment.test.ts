import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { positions, totalOpenings } from "@/lib/recruitment";

describe("recruitment configuration", () => {
  it("contains eight unique roles and sixteen confirmed openings", () => {
    expect(positions).toHaveLength(8);
    expect(new Set(positions.map((position) => position.slug)).size).toBe(8);
    expect(totalOpenings).toBe(16);
  });

  it("keeps the TypeScript and database seeds aligned", () => {
    const seed = fs.readFileSync(path.resolve("supabase/seed.sql"), "utf8");
    positions.forEach((position) => {
      expect(seed).toContain(`'${position.slug}'`);
      expect(seed).toContain(`'${position.title}'`);
    });
  });
});

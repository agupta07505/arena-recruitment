import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { positions, totalOpenings } from "@/lib/recruitment";

describe("recruitment configuration", () => {
  it("contains nine unique roles including Volunteer Coordinator", () => {
    expect(positions).toHaveLength(9);
    expect(new Set(positions.map((position) => position.slug)).size).toBe(9);
    expect(positions.some((position) => position.slug === "volunteer-coordinator")).toBe(true);
    expect(totalOpenings).toBe(17);
  });

  it("keeps the TypeScript and database seeds aligned", () => {
    const seed = fs.readFileSync(path.resolve("supabase/seed.sql"), "utf8");
    positions.forEach((position) => {
      expect(seed).toContain(`'${position.slug}'`);
      expect(seed).toContain(`'${position.title}'`);
    });
  });
});

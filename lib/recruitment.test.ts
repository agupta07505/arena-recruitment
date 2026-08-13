import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { positions, totalOpenings } from "@/lib/recruitment";

describe("recruitment configuration", () => {
  it("contains ten unique roles including both participation coordinators", () => {
    expect(positions).toHaveLength(10);
    expect(new Set(positions.map((position) => position.slug)).size).toBe(10);
    expect(positions.some((position) => position.slug === "volunteer-coordinator")).toBe(true);
    expect(positions.find((position) => position.slug === "event-ops-lead")?.eligibleYears).toEqual([3, 4]);
    expect(positions.find((position) => position.slug === "womens-participation-coordinator")?.eligibleYears).toEqual([3, 4]);
    expect(positions.filter((position) => !["event-ops-lead", "womens-participation-coordinator"].includes(position.slug)).every((position) => position.eligibleYears.join(",") === "1,2,3,4")).toBe(true);
    expect(totalOpenings).toBe(18);
  });

  it("keeps the TypeScript and database seeds aligned", () => {
    const seed = fs.readFileSync(path.resolve("supabase/seed.sql"), "utf8");
    positions.forEach((position) => {
      expect(seed).toContain(`'${position.slug}'`);
      expect(seed).toContain(`'${position.title.replaceAll("'", "''")}'`);
    });
  });
});

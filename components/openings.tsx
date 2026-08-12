"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "@/components/icons";
import { positions, type Division } from "@/lib/recruitment";

const filters: Array<{ label: string; value: Division | "all" }> = [
  { label: "All roles", value: "all" },
  { label: "Operations", value: "operations" },
  { label: "Esports", value: "esports" },
  { label: "Creative", value: "creative" },
  { label: "Technology", value: "technology" },
];

export function Openings() {
  const [filter, setFilter] = useState<Division | "all">("all");
  const shownPositions = useMemo(
    () => positions.filter((position) => filter === "all" || position.division === filter),
    [filter],
  );

  return (
    <section className="openings section" id="openings">
      <div className="section-heading reveal" data-reveal>
        <div>
          <span className="eyebrow"><b>02</b> Recruitment desk</span>
          <h2>Find your place<br />behind the play.</h2>
        </div>
        <p>
          Choose the work that fits you best. Every role contributes directly to
          stronger sports, esports, events, media, and technology at IIIT Bhopal.
        </p>
      </div>

      <div className="role-filters" data-reveal role="group" aria-label="Filter openings by team">
        {filters.map((item) => (
          <button
            className={filter === item.value ? "active" : ""}
            key={item.value}
            onClick={() => setFilter(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="roles-grid" data-reveal aria-live="polite">
        {shownPositions.map((position, index) => (
          <article className={`role-card role-${position.division}`} key={position.slug}>
            <div className="role-topline">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{position.division}</span>
            </div>
            <div>
              <span className="role-signal">{position.signal}</span>
              <h3>{position.title}</h3>
              <p>{position.summary}</p>
            </div>
            <div className="role-footer">
              <span>Open for applications</span>
              <a href={`/apply?position=${position.slug}`} aria-label={`Apply for ${position.title}`}>
                <ArrowUpRight />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

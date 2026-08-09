"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type IntroPhase = "active" | "leaving" | "done";

export function MotionSystem() {
  const [introPhase, setIntroPhase] = useState<IntroPhase>("active");
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissIntro = useCallback(() => {
    setIntroPhase((phase) => (phase === "active" ? "leaving" : phase));
    document.documentElement.classList.remove("intro-active");
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setIntroPhase("done"), 650);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    root.classList.add("motion-ready");

    if (!prefersReducedMotion.matches) root.classList.add("intro-active");

    const observed = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10%", threshold: 0.12 },
    );

    observed.forEach((element) => observer.observe(element));

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const heroProgress = Math.min(scrollY / Math.max(window.innerHeight, 1), 1);
      root.style.setProperty("--scroll-progress", `${scrollable > 0 ? scrollY / scrollable : 0}`);
      root.style.setProperty("--hero-shift", `${scrollY * 0.14}px`);
      root.style.setProperty("--orbit-shift", `${scrollY * -0.07}px`);
      root.style.setProperty("--score-shift", `${scrollY * -0.035}px`);
      root.style.setProperty("--hero-fade", `${1 - heroProgress * 0.82}`);
      document.querySelector(".site-header")?.classList.toggle("is-scrolled", scrollY > 40);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScroll);
    };

    const onPointerMove = (event: PointerEvent) => {
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
    };

    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const introTimer = prefersReducedMotion.matches
      ? setTimeout(dismissIntro, 0)
      : setTimeout(dismissIntro, 1750);

    return () => {
      clearTimeout(introTimer);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      root.classList.remove("intro-active");
    };
  }, [dismissIntro]);

  return (
    <>
      <div className="scroll-progress" aria-hidden="true" />
      <div className="ambient-cursor" aria-hidden="true" />
      {introPhase !== "done" && (
        <div className={`motion-intro intro-${introPhase}`}>
          <div className="intro-scan" aria-hidden="true" />
          <div className="intro-topline">
            <span><i /> A.R.E.N.A SIGNAL</span>
            <span>IIIT BHOPAL / 01</span>
          </div>
          <div className="intro-lock" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <div className="intro-word" aria-label="A.R.E.N.A">
            {"ARENA".split("").map((letter, index) => (
              <span key={letter + index} style={{ animationDelay: `${index * 70}ms` }}>{letter}</span>
            ))}
          </div>
          <p>Sports <b /> Esports <b /> Operations</p>
          <div className="intro-loader"><i /></div>
          <button type="button" onClick={dismissIntro}>Skip intro</button>
        </div>
      )}
    </>
  );
}

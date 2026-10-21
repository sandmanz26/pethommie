import { useEffect, type RefObject } from "react";

/** Pictures and backgrounds that drift with the scroll, and how much: a share of their distance from the screen's middle. */
const PARALLAX: [selector: string, speed: number][] = [
  ["[data-parallax]", NaN], // speed from the attribute
  ["#tour .tour__screen", -0.05],
  [".feature__art", 0.08],
  ["#for-you .kind img", 0.07],
  ["#insights .insights__shot, #insights img", -0.05],
  [".linkspot__art", -0.12],
  [".plan__art", 0.1],
  [".faq__corner", 0.16],
];

/** What fades and rises into place the first time it scrolls into view; siblings follow one another. */
const REVEAL = [
  "#tour .section-head",
  ".tour__pitch",
  "#features .section-head",
  ".feature",
  "#for-you .section-head",
  "#for-you .kind",
  "#insights .section-head",
  "#insights li",
  "#compare .section-head",
  ".compare__row",
  "#link .section-head",
  "#link li",
  "#pricing .section-head",
  ".plan",
  "#faq .section-head",
  "#faq details",
  ".cta__card",
  ".cost .section-head",
  ".cost__also",
  ".cost__calc",
  ".cost__bridge",
].join(",");

/**
 * After the film, the page keeps moving with the scroll: pictures drift (parallax) and blocks rise into place.
 * Nothing moves for visitors who ask for less motion, and without this hook everything is simply shown.
 */
export function useScrollEffects(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const main = root.current;
    if (!main || typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Parallax: one pass per frame over the drifting elements near the screen.
    const drifting = PARALLAX.flatMap(([selector, speed]) =>
      [...main.querySelectorAll<HTMLElement>(selector)].map((el) => ({ el, speed: Number.isNaN(speed) ? Number(el.dataset.parallax) : speed })),
    ).filter(({ speed }) => speed);
    for (const { el } of drifting) el.classList.add("drifts");
    let frame = 0;
    const drift = () => {
      frame = 0;
      const middle = window.innerHeight / 2;
      for (const { el, speed } of drifting) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
        el.style.setProperty("--parallax", `${((r.top + r.height / 2 - middle) * speed).toFixed(1)}px`);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(drift);
    };
    drift();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Reveal: hidden only once this runs, and shown for good the first time it is seen.
    const rising = [...main.querySelectorAll<HTMLElement>(REVEAL)];
    const seen = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          seen.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of rising) {
      const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => rising.includes(c as HTMLElement)) : [];
      el.style.setProperty("--rise-delay", `${Math.min(siblings.indexOf(el), 5) * 80}ms`);
      el.classList.add("rises");
      seen.observe(el);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      seen.disconnect();
      for (const { el } of drifting) el.classList.remove("drifts");
      for (const el of rising) el.classList.remove("rises", "is-in");
    };
  }, [root]);
}

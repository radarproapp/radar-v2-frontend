import { useEffect, useRef, useState, type ReactNode } from "react";

interface DeferredProps {
  children: ReactNode;
  /** Approximate height held open while deferred, so mounting content does not jump the scroll. */
  minHeight?: number;
  /** How far ahead of the viewport to start mounting. Generous on purpose — a row that mounts a
   *  screen early is invisible to the user, one that mounts late is a visible pop-in. */
  rootMargin?: string;
}

/**
 * Mounts its children only once they are near the viewport.
 *
 * The deferral deliberately replaces the children rather than wrapping them: a wrapper element
 * would sit inside the feed list and could change how existing `.feed-item` layout and sibling
 * selectors resolve. Instead a 1px sentinel is observed and the real nodes are rendered bare once
 * seen, so the mounted DOM is byte-for-byte what it would have been without this component.
 *
 * Once shown it stays shown — re-mounting a row on scroll-away would discard image state and
 * re-run any entry animation.
 */
export function Deferred({ children, minHeight = 180, rootMargin = "600px" }: DeferredProps) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const element = sentinel.current;
    if (!element) return;

    // No IntersectionObserver: render immediately rather than never.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setShown(true);
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown, rootMargin]);

  if (shown) return <>{children}</>;

  return (
    <>
      <div ref={sentinel} style={{ height: 1 }} aria-hidden="true" />
      <div className="feed-item" style={{ minHeight }} aria-hidden="true" />
    </>
  );
}

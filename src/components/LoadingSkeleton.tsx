interface LoadingSkeletonProps {
  variant?: "text" | "card" | "avatar" | "feed" | "stats";
  lines?: number;
  count?: number;
  width?: string;
}

export function LoadingSkeleton({ variant = "text", lines = 2, count = 3, width }: LoadingSkeletonProps) {
  return (
    <div className={`r-skeleton r-skeleton--${variant}`}>
      {variant === "text" && (
        <>
          <div className="r-skeleton__line" style={{ width: width ?? "100%" }} />
          {lines > 1 && <div className="r-skeleton__line" style={{ width: "80%" }} />}
          {lines > 2 && <div className="r-skeleton__line" style={{ width: "60%" }} />}
        </>
      )}

      {variant === "card" && (
        <div className="r-skeleton__card">
          <div className="r-skeleton__rect" style={{ height: 140 }} />
          <div style={{ padding: 16 }}>
            <div className="r-skeleton__line" style={{ width: "60%", marginBottom: 10 }} />
            <div className="r-skeleton__line" style={{ width: "100%", marginBottom: 6 }} />
            <div className="r-skeleton__line" style={{ width: "80%" }} />
          </div>
        </div>
      )}

      {variant === "avatar" && (
        <>
          <div className="r-skeleton__avatar" />
          <div style={{ flex: 1 }}>
            <div className="r-skeleton__line" style={{ width: "40%", marginBottom: 8 }} />
            <div className="r-skeleton__line" style={{ width: "60%" }} />
          </div>
        </>
      )}

      {variant === "feed" &&
        Array.from({ length: count }).map((_, i) => (
          <div className="r-skeleton__feed-item" key={i}>
            <div className="r-skeleton__rect" style={{ width: 60, height: 60, borderRadius: 10 }} />
            <div style={{ flex: 1 }}>
              <div className="r-skeleton__line" style={{ width: "30%", marginBottom: 8 }} />
              <div className="r-skeleton__line" style={{ width: "90%", marginBottom: 6 }} />
              <div className="r-skeleton__line" style={{ width: "65%" }} />
            </div>
          </div>
        ))}

      {variant === "stats" && (
        <div className="r-skeleton__stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="r-skeleton__stat" key={i}>
              <div className="r-skeleton__line" style={{ width: "50%", marginBottom: 10 }} />
              <div className="r-skeleton__line" style={{ width: "30%", height: 28, marginBottom: 6 }} />
              <div className="r-skeleton__line" style={{ width: "40%" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

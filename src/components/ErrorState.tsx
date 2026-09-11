interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", description, retryLabel = "Try again", onRetry }: ErrorStateProps) {
  return (
    <div className="r-error-state">
      <div className="r-error-state__icon">⚠</div>
      <div className="r-error-state__title">{title}</div>
      {description && <p className="r-error-state__desc">{description}</p>}
      {onRetry && (
        <button className="btn btn--accent" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}

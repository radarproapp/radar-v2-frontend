import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// One crashing page used to unmount the whole React tree and leave a silent white
// screen. Catching the render error here keeps the shell/failure visible and gives
// the user a way out instead of a dead page.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Radar UI crashed:", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="r-page">
        <div className="r-error-state">
          <div className="r-error-state__icon">!</div>
          <div className="r-error-state__title">Something went wrong</div>
          <div className="r-error-state__desc">
            Radar hit an unexpected error on this screen. Reloading usually fixes it.
          </div>

          {/* What actually broke, on the screen rather than only in the console.
              A screen that fails for one account and works for another is a data difference, and
              the one person who can see that account is the one reading this. "Something went
              wrong" sends them to devtools to find out what; this line is the thing they would
              have gone to find. */}
          {this.state.error.message && (
            <div className="r-error-state__detail">{this.state.error.message}</div>
          )}
          <button className="btn btn--primary btn--sm" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}

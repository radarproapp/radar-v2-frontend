import { Component, type ErrorInfo, type ReactNode } from "react";
import { isStaleBuild } from "../lib/lazy-page";

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
    // The place the technical detail belongs. It used to be on the screen as well, and the
    // argument for that was real - a screen that fails for one account and works for another is
    // a data difference, and the person looking at it is the only one who can see that account.
    // But what it actually put in front of people was "Failed to fetch dynamically imported
    // module: https://www.radarproapp.com/assets/LearnPath-DHvFAcaE.js", which tells a learner
    // nothing, reads as though Radar is broken, and is not even true: the file moved in a
    // deploy. A message nobody outside the team can act on does not belong on their screen.
    console.error("Radar UI crashed:", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    // A deploy landed while this browser was holding the previous one, so the page's code is at
    // a filename that no longer exists. lazyPage reloads once for this on its own; reaching here
    // means the reload has already been spent, so the honest thing is to ask rather than loop.
    const updated = isStaleBuild(this.state.error);

    return (
      <div className="r-page">
        <div className="r-error-state">
          <div className="r-error-state__icon">!</div>

          <div className="r-error-state__title">
            {updated ? "Radar has just been updated" : "This screen did not load"}
          </div>

          <div className="r-error-state__desc">
            {updated
              ? "You have an older version of Radar open. Reload to pick up the new one - nothing you have saved is affected."
              : "Something on this screen stopped working. Nothing you have saved is affected. Reloading usually fixes it."}
          </div>

          <button className="btn btn--primary btn--sm" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}

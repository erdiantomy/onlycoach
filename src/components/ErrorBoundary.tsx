import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary so a render crash doesn't render a white screen.
 * Catches unexpected throws inside the React tree; logs to console for now.
 * Network errors and predictable failures should still surface via toasts.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
          <div className="brutal-card max-w-md p-6 text-center">
            <h1 className="font-display text-3xl">Something broke.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We caught a render error so the app didn't go white. Try reloading the page.
            </p>
            <pre className="mt-3 overflow-x-auto border-2 border-ink bg-surface p-3 text-left font-mono text-xs">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: null });
                if (typeof window !== "undefined") window.location.reload();
              }}
              className="mt-4 border-2 border-ink bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-ink-foreground shadow-brutal-sm"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

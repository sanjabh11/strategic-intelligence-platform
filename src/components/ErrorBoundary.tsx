import React from 'react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

async function captureError(error: any, errorId: string | null | undefined, componentStack?: string | null | undefined) {
  if (import.meta.env.DEV) {
    console.error('ErrorBoundary caught:', error, errorId);
  }
  if (SENTRY_DSN) {
    try {
      // @ts-expect-error - @sentry/react is an optional dependency
      const { captureException } = await import('@sentry/react');
      captureException(error, { tags: { errorId }, contexts: { componentStack: { value: componentStack || '' } } });
    } catch {
      // Sentry not installed — silently fall back to console
    }
  }
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any; errorId: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error, errorId: crypto.randomUUID() };
  }

  componentDidCatch(error: any, info: React.ErrorInfo) {
    void captureError(error, this.state.errorId, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-500/50 rounded-lg max-w-lg mx-auto mt-8" role="alert">
          <h2 className="text-red-500 text-lg font-semibold">Something went wrong.</h2>
          <p className="mt-2 text-sm text-slate-400">
            An unexpected error occurred. Please try reloading the page.
          </p>
          {this.state.errorId && (
            <p className="mt-2 text-xs text-slate-500">
              Error ID: {this.state.errorId}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
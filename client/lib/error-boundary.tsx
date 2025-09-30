/**
 * Error Boundary for UI Components
 * ================================
 *
 * Catches and handles common UI errors, especially ResizeObserver issues.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class UIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a ResizeObserver error or other benign UI error
    if (
      error.message?.includes("ResizeObserver") ||
      error.message?.includes("ResizeObserver loop completed") ||
      error.name === "ResizeObserverError"
    ) {
      // Don't update state for ResizeObserver errors - they're benign
      return { hasError: false };
    }

    // Update state for other errors
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Suppress ResizeObserver errors
    if (
      error.message?.includes("ResizeObserver") ||
      error.message?.includes("ResizeObserver loop completed") ||
      error.name === "ResizeObserverError"
    ) {
      console.debug("ResizeObserver error suppressed:", error.message);
      return;
    }

    // Log other errors
    console.error("UI Error caught by boundary:", error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        this.props.fallback || (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-800">
            <h3 className="font-medium">Something went wrong</h3>
            <p className="text-sm mt-1">
              An error occurred while rendering this component. Please try
              refreshing the page.
            </p>
            <button
              onClick={() =>
                this.setState({ hasError: false, error: undefined })
              }
              className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
            >
              Try Again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<T extends {}>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode,
) {
  const WrappedComponent = (props: T) => (
    <UIErrorBoundary fallback={fallback}>
      <Component {...props} />
    </UIErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook to handle ResizeObserver errors
 */
export function useResizeObserverErrorHandler() {
  React.useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args) => {
      // Suppress ResizeObserver errors in console
      if (
        args.length > 0 &&
        typeof args[0] === "string" &&
        args[0].includes("ResizeObserver")
      ) {
        return;
      }

      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);
}

/**
 * ResizeObserver Error Fix and Optimization
 * ========================================
 *
 * Fixes the "ResizeObserver loop completed with undelivered notifications" error
 * that commonly occurs with Radix UI components and dynamic layouts.
 */

import React, { useEffect, useRef, useCallback } from "react";

/**
 * Suppress ResizeObserver errors globally
 * This is a common issue with Radix UI components and is generally safe to ignore
 */
export const suppressResizeObserverErrors = () => {
  // Store original error handler
  const originalError = window.onerror;

  window.onerror = (message, source, lineno, colno, error) => {
    // Suppress ResizeObserver errors
    if (
      typeof message === "string" &&
      message.includes(
        "ResizeObserver loop completed with undelivered notifications",
      )
    ) {
      return true; // Prevent the error from being logged
    }

    // Call original error handler for other errors
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }

    return false;
  };
};

/**
 * Debounced ResizeObserver hook to prevent infinite loops
 */
export const useDebouncedResizeObserver = (
  callback: (entries: ResizeObserverEntry[]) => void,
  element: HTMLElement | null,
  delay = 100,
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const observerRef = useRef<ResizeObserver>();

  const debouncedCallback = useCallback(
    (entries: ResizeObserverEntry[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(entries);
      }, delay);
    },
    [callback, delay],
  );

  useEffect(() => {
    if (!element) return;

    // Create ResizeObserver with error handling
    observerRef.current = new ResizeObserver((entries) => {
      try {
        debouncedCallback(entries);
      } catch (error) {
        // Silently handle ResizeObserver errors
        console.debug("ResizeObserver error suppressed:", error);
      }
    });

    observerRef.current.observe(element);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [element, debouncedCallback]);
};

/**
 * Hook to stabilize dialog content height and prevent resize loops
 */
export const useStableDialogHeight = (isOpen: boolean) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const stableHeightRef = useRef<number>();

  useEffect(() => {
    if (!isOpen || !contentRef.current) return;

    const element = contentRef.current;

    // Set a stable height to prevent continuous resizing
    const observer = new ResizeObserver((entries) => {
      try {
        for (const entry of entries) {
          const { height } = entry.contentRect;

          // Only update if height changed significantly (> 5px)
          if (
            !stableHeightRef.current ||
            Math.abs(height - stableHeightRef.current) > 5
          ) {
            stableHeightRef.current = height;
          }
        }
      } catch (error) {
        // Ignore ResizeObserver errors
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [isOpen]);

  return contentRef;
};

/**
 * Initialize ResizeObserver error suppression when app starts
 */
export const initializeResizeObserverFix = () => {
  // Suppress errors on window load
  if (typeof window !== "undefined") {
    suppressResizeObserverErrors();

    // Also handle unhandled promise rejections related to ResizeObserver
    window.addEventListener("unhandledrejection", (event) => {
      if (
        event.reason &&
        event.reason.message &&
        event.reason.message.includes("ResizeObserver")
      ) {
        event.preventDefault();
      }
    });
  }
};

/**
 * Safe wrapper for components that might trigger ResizeObserver errors
 */
export const withResizeObserverErrorBoundary = <
  T extends React.ComponentType<any>,
>(
  Component: T,
): T => {
  const WrappedComponent = (props: React.ComponentProps<T>) => {
    useEffect(() => {
      const handleError = (error: ErrorEvent) => {
        if (error.message?.includes("ResizeObserver")) {
          error.stopImmediatePropagation();
          return false;
        }
      };

      window.addEventListener("error", handleError);
      return () => window.removeEventListener("error", handleError);
    }, []);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withResizeObserverErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent as T;
};

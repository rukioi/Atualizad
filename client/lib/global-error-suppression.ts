/**
 * Global Error Suppression
 * ========================
 *
 * Suppresses common benign errors like ResizeObserver loops that are safe to ignore.
 * This should be loaded as early as possible in the application.
 */

// Suppress ResizeObserver errors globally
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Check if this is a ResizeObserver error
  if (
    args.length > 0 &&
    typeof args[0] === "string" &&
    (args[0].includes(
      "ResizeObserver loop completed with undelivered notifications",
    ) ||
      args[0].includes("ResizeObserver loop limit exceeded") ||
      args[0].includes("ResizeObserver"))
  ) {
    // Silently ignore ResizeObserver errors
    return;
  }

  // Log other errors normally
  originalConsoleError.apply(console, args);
};

// Suppress ResizeObserver errors in window.onerror
const originalOnError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  if (
    typeof message === "string" &&
    (message.includes(
      "ResizeObserver loop completed with undelivered notifications",
    ) ||
      message.includes("ResizeObserver loop limit exceeded") ||
      message.includes("ResizeObserver"))
  ) {
    return true; // Prevent the error from being logged
  }

  if (originalOnError) {
    return originalOnError(message, source, lineno, colno, error);
  }

  return false;
};

// Suppress unhandled promise rejections for ResizeObserver
window.addEventListener("unhandledrejection", (event) => {
  if (
    event.reason &&
    event.reason.message &&
    (event.reason.message.includes(
      "ResizeObserver loop completed with undelivered notifications",
    ) ||
      event.reason.message.includes("ResizeObserver loop limit exceeded") ||
      event.reason.message.includes("ResizeObserver"))
  ) {
    event.preventDefault();
  }
});

// Export a function to manually suppress errors if needed
export const suppressResizeObserverError = (error: Error): boolean => {
  return (
    error.message.includes(
      "ResizeObserver loop completed with undelivered notifications",
    ) ||
    error.message.includes("ResizeObserver loop limit exceeded") ||
    error.message.includes("ResizeObserver") ||
    error.name === "ResizeObserverError"
  );
};

// Debug function to check if errors are being suppressed
export const enableResizeObserverDebug = () => {
  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      args.length > 0 &&
      typeof args[0] === "string" &&
      args[0].includes("ResizeObserver")
    ) {
      console.debug("ResizeObserver warning suppressed:", ...args);
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
};

// Initialize suppression when module loads
if (typeof window !== "undefined") {
  console.debug("ResizeObserver error suppression initialized");
}

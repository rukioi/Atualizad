/**
 * Optimized ScrollArea Component
 * =============================
 *
 * Prevents ResizeObserver loops when used inside dialogs or other scrollable containers.
 * Use this instead of the regular ScrollArea in dialogs.
 */

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import { useDebouncedResizeObserver } from "@/lib/resize-observer-fix";

interface OptimizedScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /**
   * When true, disables the internal ResizeObserver to prevent loops
   * Use when the parent container already handles scrolling
   */
  preventResizeLoop?: boolean;

  /**
   * Debounce delay for resize calculations (default: 150ms)
   */
  resizeDebounce?: number;
}

const OptimizedScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  OptimizedScrollAreaProps
>(
  (
    {
      className,
      children,
      preventResizeLoop = false,
      resizeDebounce = 150,
      ...props
    },
    ref,
  ) => {
    const [shouldUseScrollArea, setShouldUseScrollArea] =
      React.useState(!preventResizeLoop);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Check if parent is already scrollable to prevent conflicts
    React.useEffect(() => {
      if (preventResizeLoop) {
        setShouldUseScrollArea(false);
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      // Check if any parent has overflow scrolling
      let parent = container.parentElement;
      let hasScrollableParent = false;

      while (parent && parent !== document.body) {
        const computedStyle = window.getComputedStyle(parent);
        const overflow = computedStyle.overflow;
        const overflowY = computedStyle.overflowY;

        if (
          overflow === "auto" ||
          overflow === "scroll" ||
          overflowY === "auto" ||
          overflowY === "scroll"
        ) {
          hasScrollableParent = true;
          break;
        }

        parent = parent.parentElement;
      }

      // If parent is scrollable, use simple div instead of ScrollArea
      setShouldUseScrollArea(!hasScrollableParent);
    }, [preventResizeLoop]);

    // Debounced resize observer for optimization
    useDebouncedResizeObserver(
      React.useCallback((entries) => {
        // Handle resize if needed
        entries.forEach((entry) => {
          const { target } = entry;
          // Custom resize logic can go here if needed
        });
      }, []),
      containerRef.current,
      resizeDebounce,
    );

    // If we should not use ScrollArea (to prevent conflicts), render a simple scrollable div
    if (!shouldUseScrollArea) {
      return (
        <div
          ref={containerRef}
          className={cn("overflow-auto", className)}
          {...props}
        >
          {children}
        </div>
      );
    }

    // Otherwise, use the full ScrollArea component
    return (
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          ref={containerRef}
          className="h-full w-full rounded-[inherit]"
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <OptimizedScrollBar />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    );
  },
);

OptimizedScrollArea.displayName = "OptimizedScrollArea";

const OptimizedScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));

OptimizedScrollBar.displayName = "OptimizedScrollBar";

/**
 * Hook to determine if ScrollArea should be used based on container context
 */
export const useScrollAreaContext = () => {
  const [isInDialog, setIsInDialog] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if we're inside a dialog
    const isInDialogElement = element.closest('[role="dialog"]') !== null;
    setIsInDialog(isInDialogElement);
  }, []);

  return { isInDialog, ref };
};

export { OptimizedScrollArea, OptimizedScrollBar };

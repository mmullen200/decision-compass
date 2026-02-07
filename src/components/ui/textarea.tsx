import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, style, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-lg border border-border bg-input px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-300 focus:border-primary/50 resize-none",
        className,
      )}
      ref={ref}
      style={{ 
        fontSize: '16px',
        pointerEvents: 'auto',
        transform: 'none',
        ...style 
      }}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

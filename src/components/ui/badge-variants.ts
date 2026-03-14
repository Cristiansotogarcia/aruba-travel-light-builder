import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/85",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/85",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/85",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

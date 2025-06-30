import { jsx as _jsx } from "react/jsx-runtime";
import { badgeVariants } from "./badge-variants";
import { cn } from "@/lib/utils";
function Badge({ className, variant, ...props }) {
    return (_jsx("div", { className: cn(badgeVariants({ variant }), className), ...props }));
}
export { Badge }; // Removed badgeVariants from export

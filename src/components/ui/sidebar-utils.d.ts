import * as React from "react";
export type SidebarContextValue = {
    state: "expanded" | "collapsed";
    open: boolean;
    setOpen: (open: boolean) => void;
    openMobile: boolean;
    setOpenMobile: (open: boolean) => void;
    isMobile: boolean;
    toggleSidebar: () => void;
};
export declare const SidebarContext: React.Context<SidebarContextValue | null>;
export declare function useSidebar(): SidebarContextValue;

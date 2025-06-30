export declare const ACTIVITY_EVENTS: readonly ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
export declare const STORAGE_KEY = "auth:lastActivity";
interface Options {
    isActive: boolean;
    onInactive: () => void;
    inactivityLimit?: number;
    checkInterval?: number;
}
export declare const useInactivityLogout: ({ isActive, onInactive, inactivityLimit, checkInterval, }: Options) => void;
export {};

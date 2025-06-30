import { jsx as _jsx } from "react/jsx-runtime";
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { useInactivityLogout, STORAGE_KEY } from './useInactivityLogout';
function TestComponent({ onInactive, isActive }) {
    useInactivityLogout({ isActive, onInactive, inactivityLimit: 1000, checkInterval: 100 });
    return null;
}
describe('useInactivityLogout', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it('signs out after inactivity limit without activity', () => {
        const fn = vi.fn();
        render(_jsx(TestComponent, { onInactive: fn, isActive: true }));
        act(() => {
            vi.advanceTimersByTime(1100);
        });
        expect(fn).toHaveBeenCalledTimes(1);
    });
    it('resets timer when activity occurs in another tab', () => {
        const fn = vi.fn();
        render(_jsx(TestComponent, { onInactive: fn, isActive: true }));
        act(() => {
            vi.advanceTimersByTime(700);
        });
        const newTime = Date.now();
        act(() => {
            window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: String(newTime) }));
        });
        act(() => {
            vi.advanceTimersByTime(700);
        });
        expect(fn).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(400);
        });
        expect(fn).toHaveBeenCalledTimes(1);
    });
});

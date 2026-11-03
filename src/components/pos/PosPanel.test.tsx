import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./PosWizard', () => ({ PosWizard: () => <div data-testid="pos-wizard-stub">PosWizard stub</div> }));
vi.mock('./today/TodayBoard', () => ({ TodayBoard: () => <div data-testid="today-board-stub">TodayBoard stub</div> }));
vi.mock('./drawer/DrawerTab', () => ({ DrawerTab: () => <div data-testid="drawer-tab-stub">DrawerTab stub</div> }));
vi.mock('./report/ReportTab', () => ({ ReportTab: () => <div data-testid="report-tab-stub">ReportTab stub</div> }));

import { PosPanel } from './PosPanel';

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

describe('PosPanel tabs', () => {
  it('defaults to the New sale tab showing PosWizard, with the other tabs not mounted', () => {
    render(<PosPanel />);

    expect(screen.getByTestId('pos-wizard-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('today-board-stub')).not.toBeInTheDocument();
    expect(screen.queryByTestId('drawer-tab-stub')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-tab-stub')).not.toBeInTheDocument();
  });

  it('switches to TodayBoard on the Today tab', async () => {
    const user = userEvent.setup();
    render(<PosPanel />);

    await user.click(screen.getByRole('tab', { name: /today/i }));

    expect(screen.getByTestId('today-board-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('pos-wizard-stub')).not.toBeInTheDocument();
  });

  it('switches to DrawerTab on the Drawer tab', async () => {
    const user = userEvent.setup();
    render(<PosPanel />);

    await user.click(screen.getByRole('tab', { name: /drawer/i }));

    expect(screen.getByTestId('drawer-tab-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('pos-wizard-stub')).not.toBeInTheDocument();
  });

  it('switches to ReportTab on the Report tab', async () => {
    const user = userEvent.setup();
    render(<PosPanel />);

    await user.click(screen.getByRole('tab', { name: /report/i }));

    expect(screen.getByTestId('report-tab-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('pos-wizard-stub')).not.toBeInTheDocument();
  });
});

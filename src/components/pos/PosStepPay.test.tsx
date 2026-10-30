import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PosStepPay } from './PosStepPay';
import type { PosPaymentLine } from '@/lib/pos/posPayments';

const noop = () => {};

describe('PosStepPay', () => {
  it('disables Charge with no payment lines', () => {
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={[]}
        onLinesChange={noop}
        onCharge={noop}
        onPayLater={noop}
        submitting={false}
        errorMessage={null}
      />,
    );
    expect(screen.getByTestId('pos-pay-charge')).toBeDisabled();
  });

  it('disables Charge while a line is invalid (card without reference)', () => {
    const lines: PosPaymentLine[] = [{ method: 'card', amount: 40 }];
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={lines}
        onLinesChange={noop}
        onCharge={noop}
        onPayLater={noop}
        submitting={false}
        errorMessage={null}
      />,
    );
    expect(screen.getByTestId('pos-pay-charge')).toBeDisabled();
  });

  it('disables Charge while the set is overpaid', () => {
    const lines: PosPaymentLine[] = [{ method: 'other', amount: 999 }];
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={lines}
        onLinesChange={noop}
        onCharge={noop}
        onPayLater={noop}
        submitting={false}
        errorMessage={null}
      />,
    );
    expect(screen.getByTestId('pos-pay-charge')).toBeDisabled();
  });

  it('enables Charge once a clean cash line covers the estimated total, and shows change due', () => {
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 50 }];
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={lines}
        onLinesChange={noop}
        onCharge={noop}
        onPayLater={noop}
        submitting={false}
        errorMessage={null}
      />,
    );
    expect(screen.getByTestId('pos-pay-charge')).not.toBeDisabled();
    expect(screen.getByTestId('pos-change-due-0')).toHaveTextContent('$10.00');
  });

  it('shows $0.00 change due when tendered exactly matches the amount', () => {
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 40 }];
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={lines}
        onLinesChange={noop}
        onCharge={noop}
        onPayLater={noop}
        submitting={false}
        errorMessage={null}
      />,
    );
    expect(screen.getByTestId('pos-change-due-0')).toHaveTextContent('$0.00');
  });

  it('calls onCharge when Charge is clicked while valid', async () => {
    const user = userEvent.setup();
    const onCharge = vi.fn();
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 40 }];
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={lines}
        onLinesChange={noop}
        onCharge={onCharge}
        onPayLater={noop}
        submitting={false}
        errorMessage={null}
      />,
    );
    await user.click(screen.getByTestId('pos-pay-charge'));
    expect(onCharge).toHaveBeenCalledTimes(1);
  });

  it('Pay later stays enabled even with no payment lines, and calls onPayLater', async () => {
    const user = userEvent.setup();
    const onPayLater = vi.fn();
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={[]}
        onLinesChange={noop}
        onCharge={noop}
        onPayLater={onPayLater}
        submitting={false}
        errorMessage={null}
      />,
    );
    const payLaterButton = screen.getByText('Pay later');
    expect(payLaterButton).not.toBeDisabled();
    await user.click(payLaterButton);
    expect(onPayLater).toHaveBeenCalledTimes(1);
  });

  it('with a cash line and no open drawer, warns and disables Charge (the server refuses NO_OPEN_DRAWER)', () => {
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 40 }];
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={lines}
        onLinesChange={noop}
        onCharge={noop}
        onPayLater={noop}
        submitting={false}
        errorMessage={null}
        drawerOpen={false}
      />,
    );
    expect(screen.getByTestId('pos-pay-drawer-warning-0')).toHaveTextContent('Drawer is not open.');
    expect(screen.getByTestId('pos-pay-charge')).toBeDisabled();
  });

  it('shows no drawer warning when drawerOpen is true or omitted', () => {
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 40 }];
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={lines}
        onLinesChange={noop}
        onCharge={noop}
        onPayLater={noop}
        submitting={false}
        errorMessage={null}
      />,
    );
    expect(screen.queryByTestId('pos-pay-drawer-warning-0')).not.toBeInTheDocument();
  });

  it('disables both actions while submitting', () => {
    const lines: PosPaymentLine[] = [{ method: 'cash', amount: 40, tendered: 40 }];
    render(
      <PosStepPay
        estimatedTotal={40}
        lines={lines}
        onLinesChange={noop}
        onCharge={noop}
        onPayLater={noop}
        submitting
        errorMessage={null}
      />,
    );
    expect(screen.getByTestId('pos-pay-charge')).toBeDisabled();
    expect(screen.getByText('Pay later')).toBeDisabled();
  });
});

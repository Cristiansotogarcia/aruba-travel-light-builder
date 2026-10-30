import { ShoppingCart } from 'lucide-react';
import { AppShell, type AppNavEntry } from '@/components/layout/app-shell';
import { PosWizard } from '@/components/pos';

const POS_NAV: AppNavEntry[] = [{ id: 'sale', label: 'New sale', icon: ShoppingCart }];

/** /pos — counter rental (contract: PLANS/TLB_POS_PHASE1_CONTRACT.md).
 * Role-gated in App.tsx to StoreStaff/Booker/Admin/SuperUser, same as /depot. */
const Pos = () => {
  return (
    <AppShell
      panelName="Point of Sale"
      nav={POS_NAV}
      activeSection="sale"
      onSectionChange={() => {}}
      contentClassName="max-w-2xl"
      pageTitle="Point of Sale"
      pageDescription="Ring up a counter rental: pick equipment, add the customer, take payment."
    >
      <PosWizard />
    </AppShell>
  );
};

export default Pos;

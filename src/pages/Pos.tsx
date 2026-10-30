import { useState } from 'react';
import { CalendarClock, ShoppingCart } from 'lucide-react';
import { AppShell, type AppNavEntry } from '@/components/layout/app-shell';
import { PosWizard, TodayBoard } from '@/components/pos';

const POS_NAV: AppNavEntry[] = [
  { id: 'sale', label: 'New sale', icon: ShoppingCart },
  { id: 'today', label: 'Today', icon: CalendarClock },
];

const SECTION_COPY: Record<string, { title: string; description: string; contentClassName: string }> = {
  sale: {
    title: 'Point of Sale',
    description: 'Ring up a counter rental: pick equipment, add the customer, take payment.',
    contentClassName: 'max-w-2xl',
  },
  today: {
    title: 'Today',
    description:
      "Store Pickups / Store Returns due today, Deliveries / Collections out today. Hand over, check in a return, extend a rental or refund via credit note.",
    contentClassName: 'max-w-5xl',
  },
};

/** /pos — counter rental (phase 1, contract: PLANS/TLB_POS_PHASE1_CONTRACT.md)
 * and counter ops (phase 2, plan: PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md
 * lines 49-62). Role-gated in App.tsx to StoreStaff/Booker/Admin/SuperUser,
 * same as /depot. */
const Pos = () => {
  const [section, setSection] = useState<'sale' | 'today'>('sale');
  const copy = SECTION_COPY[section];

  return (
    <AppShell
      panelName="Point of Sale"
      nav={POS_NAV}
      activeSection={section}
      onSectionChange={(id) => setSection(id === 'today' ? 'today' : 'sale')}
      contentClassName={copy.contentClassName}
      pageTitle={copy.title}
      pageDescription={copy.description}
    >
      {section === 'sale' ? <PosWizard /> : <TodayBoard />}
    </AppShell>
  );
};

export default Pos;

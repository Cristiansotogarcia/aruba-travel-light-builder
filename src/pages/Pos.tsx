import { useState } from 'react';
import { CalendarClock, FileBarChart, Lock, ShoppingCart } from 'lucide-react';
import { AppShell, type AppNavEntry } from '@/components/layout/app-shell';
import { PosWizard, TodayBoard, DrawerTab, ReportTab } from '@/components/pos';

type PosSection = 'sale' | 'today' | 'drawer' | 'report';

const POS_NAV: AppNavEntry[] = [
  { id: 'sale', label: 'New sale', icon: ShoppingCart },
  { id: 'today', label: 'Today', icon: CalendarClock },
  { id: 'drawer', label: 'Drawer', icon: Lock },
  { id: 'report', label: 'Report', icon: FileBarChart },
];

const SECTION_COPY: Record<PosSection, { title: string; description: string; contentClassName: string }> = {
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
  drawer: {
    title: 'Drawer',
    description: 'Open the cash drawer with a float, close it out counting cash against expected, variance and all.',
    contentClassName: 'max-w-2xl',
  },
  report: {
    title: 'Report',
    description: 'End-of-day totals by payment method and staff, plus the drawer sessions opened that day.',
    contentClassName: 'max-w-5xl',
  },
};

const isPosSection = (id: string): id is PosSection => id === 'today' || id === 'drawer' || id === 'report' || id === 'sale';

/** /pos — counter rental (phase 1, contract: PLANS/TLB_POS_PHASE1_CONTRACT.md),
 * counter ops (phase 2, plan: PLANS/TLB_ROXANNE_NOTES_AND_POS_PLAN.md lines
 * 49-62) and cash close-out (phase 3, contract:
 * PLANS/TLB_POS_PHASE3_CONTRACT.md). Role-gated in App.tsx to
 * StoreStaff/Booker/Admin/SuperUser, same as /depot. */
const Pos = () => {
  const [section, setSection] = useState<PosSection>('sale');
  const copy = SECTION_COPY[section];

  return (
    <AppShell
      panelName="Point of Sale"
      nav={POS_NAV}
      activeSection={section}
      onSectionChange={(id) => setSection(isPosSection(id) ? id : 'sale')}
      contentClassName={copy.contentClassName}
      pageTitle={copy.title}
      pageDescription={copy.description}
    >
      {section === 'sale' && <PosWizard />}
      {section === 'today' && <TodayBoard />}
      {section === 'drawer' && <DrawerTab />}
      {section === 'report' && <ReportTab />}
    </AppShell>
  );
};

export default Pos;

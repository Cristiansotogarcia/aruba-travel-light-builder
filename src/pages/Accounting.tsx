import { useEffect, useMemo, useState } from 'react';
import { CreditCard, FileMinus, FileText, LayoutDashboard } from 'lucide-react';

import { AccountingInvoicesPanel } from '@/components/accounting/AccountingInvoicesPanel';
import { AccountingOverview } from '@/components/accounting/AccountingOverview';
import { CreditNotesPanel } from '@/components/accounting/CreditNotesPanel';
import { AccountingReports } from '@/components/admin/AccountingReports';
import { AppShell, type AppNavEntry } from '@/components/layout/app-shell';

const STORAGE_KEY = 'accounting:activeSection';

const ACCOUNTING_NAV: AppNavEntry[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: CreditCard },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'credit-notes', label: 'Credit Notes', icon: FileMinus },
];

const Accounting = () => {
  const [activeSection, setActiveSection] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) || 'overview'
  );

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, activeSection);
  }, [activeSection]);

  const nav = useMemo(() => ACCOUNTING_NAV, []);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'transactions':
        return <AccountingReports />;
      case 'invoices':
        return <AccountingInvoicesPanel />;
      case 'credit-notes':
        return <CreditNotesPanel />;
      case 'overview':
      default:
        return <AccountingOverview onNavigate={setActiveSection} />;
    }
  };

  return (
    <AppShell
      panelName="Accounting"
      nav={nav}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      contentClassName="max-w-none p-0"
    >
      {renderActiveSection()}
    </AppShell>
  );
};

export default Accounting;

import { useEffect, useState } from 'react';

import { AccountingInvoicesPanel } from '@/components/accounting/AccountingInvoicesPanel';
import { AccountingOverview } from '@/components/accounting/AccountingOverview';
import { AccountingSidebar } from '@/components/accounting/AccountingSidebar';
import { AccountingReports } from '@/components/admin/AccountingReports';
import { DashboardLayout } from '@/components/admin/DashboardLayout';

const STORAGE_KEY = 'accounting:activeSection';

const Accounting = () => {
  const [activeSection, setActiveSection] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) || 'overview'
  );

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, activeSection);
  }, [activeSection]);

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'transactions':
        return <AccountingReports />;
      case 'invoices':
        return <AccountingInvoicesPanel />;
      case 'overview':
      default:
        return <AccountingOverview onNavigate={setActiveSection} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen flex w-full">
        <AccountingSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 overflow-y-auto bg-slate-50/40">{renderActiveSection()}</main>
      </div>
    </DashboardLayout>
  );
};

export default Accounting;

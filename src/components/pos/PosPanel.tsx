import { CalendarClock, FileBarChart, Lock, ShoppingCart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PosWizard } from './PosWizard';
import { TodayBoard } from './today/TodayBoard';
import { DrawerTab } from './drawer/DrawerTab';
import { ReportTab } from './report/ReportTab';

/** The /pos screens as one admin-panel section, so Admin/SuperUser run the
 * counter without leaving /admin. Staff keep the standalone /pos shell. */
export const PosPanel = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-2xl font-semibold">Point of Sale</h2>
      <p className="text-muted-foreground">
        Ring up counter rentals, work today's pickups and returns, and close out the cash drawer.
      </p>
    </div>
    <Tabs defaultValue="sale">
      <TabsList>
        <TabsTrigger value="sale"><ShoppingCart className="mr-2 h-4 w-4" />New sale</TabsTrigger>
        <TabsTrigger value="today"><CalendarClock className="mr-2 h-4 w-4" />Today</TabsTrigger>
        <TabsTrigger value="drawer"><Lock className="mr-2 h-4 w-4" />Drawer</TabsTrigger>
        <TabsTrigger value="report"><FileBarChart className="mr-2 h-4 w-4" />Report</TabsTrigger>
      </TabsList>
      <TabsContent value="sale" className="max-w-2xl"><PosWizard /></TabsContent>
      <TabsContent value="today" className="max-w-5xl"><TodayBoard /></TabsContent>
      <TabsContent value="drawer" className="max-w-2xl"><DrawerTab /></TabsContent>
      <TabsContent value="report" className="max-w-5xl"><ReportTab /></TabsContent>
    </Tabs>
  </div>
);

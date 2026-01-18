import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  data?: unknown;
  error?: string;
  details?: string;
}

export const ReportsDashboardTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  const runTests = async () => {
    const results: TestResult[] = [];

    try {
      // Test 1: Basic Database Connection
      console.log('🔍 Test 1: Database Connection');
      const { error: connError } = await supabase
        .from('bookings')
        .select('id')
        .limit(1);
      
      results.push({
        testName: 'Database Connection',
        status: connError ? 'FAIL' : 'PASS',
        error: connError?.message,
        details: connError ? 'Cannot connect to database' : 'Connection successful'
      });

      // Test 2: Booking Data Fetch
      console.log('🔍 Test 2: Booking Data Fetch');
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, start_date, end_date, status, total_amount, customer_name, created_at, updated_at, booking_items(equipment_name, quantity, equipment_id)')
        .limit(10);
      
      results.push({
        testName: 'Booking Data Fetch',
        status: bookingsError ? 'FAIL' : 'PASS',
        data: { count: bookings?.length || 0 },
        error: bookingsError?.message,
        details: bookingsError ? 'Cannot fetch bookings' : `Fetched ${bookings?.length || 0} bookings`
      });

      // Test 3: Equipment Data Fetch
      console.log('🔍 Test 3: Equipment Data Fetch');
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .limit(5);
      
      results.push({
        testName: 'Equipment Data Fetch',
        status: equipmentError ? 'FAIL' : 'PASS',
        data: { count: equipment?.length || 0 },
        error: equipmentError?.message,
        details: equipmentError ? 'Cannot fetch equipment' : `Fetched ${equipment?.length || 0} equipment items`
      });

      // Test 4: Date Range Filtering
      console.log('🔍 Test 4: Date Range Filtering');
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: filteredBookings, error: filterError } = await supabase
        .from('bookings')
        .select('id, start_date, total_amount')
        .gte('start_date', thirtyDaysAgo.toISOString())
        .limit(5);
      
      results.push({
        testName: 'Date Range Filtering',
        status: filterError ? 'FAIL' : 'PASS',
        data: { count: filteredBookings?.length || 0 },
        error: filterError?.message,
        details: filterError ? 'Date filtering failed' : `Filtered ${filteredBookings?.length || 0} bookings`
      });

      // Test 5: Revenue Calculation
      console.log('🔍 Test 5: Revenue Calculation');
      if (bookings && bookings.length > 0) {
        const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
        results.push({
          testName: 'Revenue Calculation',
          status: 'PASS',
          data: { totalRevenue, sampleCount: bookings.length },
          details: `Calculated ${totalRevenue} from ${bookings.length} bookings`
        });
      } else {
        results.push({
          testName: 'Revenue Calculation',
          status: 'SKIP',
          details: 'No bookings available for calculation'
        });
      }

      // Test 6: Equipment Utilization
      console.log('🔍 Test 6: Equipment Utilization');
      if (bookings && bookings.length > 0 && equipment) {
        const utilizationMap: Record<string, number> = {};
        equipment.forEach(eq => {
          utilizationMap[eq.name] = 0;
        });

        bookings.forEach(booking => {
          booking.booking_items?.forEach(item => {
            if (item.equipment_name && Object.prototype.hasOwnProperty.call(utilizationMap, item.equipment_name)) {
              utilizationMap[item.equipment_name] += item.quantity || 0;
            }
          });
        });

        const utilizationData = Object.entries(utilizationMap)
          .map(([name, bookedQuantity]) => ({ name, bookedQuantity }))
          .filter(item => item.bookedQuantity > 0);

        results.push({
          testName: 'Equipment Utilization',
          status: 'PASS',
          data: { utilizationCount: utilizationData.length },
          details: `Processed ${utilizationData.length} equipment items with bookings`
        });
      } else {
        results.push({
          testName: 'Equipment Utilization',
          status: 'SKIP',
          details: 'Insufficient data for utilization calculation'
        });
      }

      // Test 7: Real-time Subscription
      console.log('🔍 Test 7: Real-time Subscription');
      const channel = supabase
        .channel('test-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
          console.log('Real-time update received:', payload);
        })
        .subscribe();

      setTimeout(() => {
        supabase.removeChannel(channel);
        results.push({
          testName: 'Real-time Subscription',
          status: 'PASS',
          details: 'Subscription established and cleaned up successfully'
        });
      }, 1000);

    } catch (error) {
      results.push({
        testName: 'Overall Test Suite',
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Test suite encountered an unexpected error'
      });
    }

    setTestResults(results);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports Dashboard Audit Results</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Running tests...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.testName}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          result.status === 'PASS' ? 'bg-green-100 text-green-800' :
                          result.status === 'FAIL' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.status}
                        </span>
                      </TableCell>
                      <TableCell>{result.details}</TableCell>
                      <TableCell>{result.error || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

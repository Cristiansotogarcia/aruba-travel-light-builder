import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Phone, Mail, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
export const DriverTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const { hasPermission, profile } = useAuth();
    const { toast } = useToast();
    useEffect(() => {
        if (hasPermission('DriverTasks') && profile?.id) {
            fetchTasks(profile.id); // Pass profile.id directly
        }
    }, [hasPermission, profile]);
    const fetchTasks = async (driverId) => {
        try {
            // Fetch bookings assigned to current driver
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('assigned_to', driverId) // Use driverId here
                .order('start_date', { ascending: true });
            if (error)
                throw error;
            // Convert bookings to tasks (delivery + pickup)
            const allTasks = [];
            data?.forEach(booking => {
                // Delivery task
                allTasks.push({
                    ...booking,
                    task_type: 'delivery'
                });
                // Pickup task
                allTasks.push({
                    ...booking,
                    task_type: 'pickup'
                });
            });
            setTasks(allTasks);
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            toast({
                title: "Error",
                description: "Failed to load tasks",
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const getTaskDate = (task) => {
        return task.task_type === 'delivery' ? task.start_date : task.end_date;
    };
    const getTaskColor = (taskType) => {
        return taskType === 'delivery'
            ? 'bg-green-100 text-green-800'
            : 'bg-blue-100 text-blue-800';
    };
    if (!hasPermission('DriverTasks')) {
        return (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-gray-500", children: "You don't have permission to access driver tasks." }) }));
    }
    if (loading) {
        return (_jsx("div", { className: "space-y-6", children: _jsxs("div", { className: "animate-pulse", children: [_jsx("div", { className: "h-8 bg-gray-200 rounded w-1/3 mb-4" }), _jsx("div", { className: "space-y-4", children: [...Array(3)].map((_, i) => (_jsx("div", { className: "h-32 bg-gray-200 rounded" }, i))) })] }) }));
    }
    const upcomingTasks = tasks
        .filter(task => new Date(getTaskDate(task)) >= new Date())
        .sort((a, b) => new Date(getTaskDate(a)).getTime() - new Date(getTaskDate(b)).getTime());
    const todayTasks = upcomingTasks.filter(task => {
        const taskDate = new Date(getTaskDate(task));
        const today = new Date();
        return taskDate.toDateString() === today.toDateString();
    });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "My Tasks" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Your assigned deliveries and pickups" })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Truck, { className: "h-5 w-5" }), "Today's Tasks (", todayTasks.length, ")"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-4", children: todayTasks.length > 0 ? (todayTasks.map((task) => ( // Removed unused index
                            _jsx("div", { className: "p-4 border border-gray-200 rounded-lg bg-yellow-50", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h3", { className: "font-medium text-gray-900", children: task.customer_name }), _jsx(Badge, { className: getTaskColor(task.task_type), children: task.task_type })] }), _jsxs("div", { className: "space-y-2 text-sm text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MapPin, { className: "h-4 w-4" }), task.customer_address] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Phone, { className: "h-4 w-4" }), task.customer_phone] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Mail, { className: "h-4 w-4" }), task.customer_email] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Calendar, { className: "h-4 w-4" }), new Date(getTaskDate(task)).toLocaleDateString(), " at ", new Date(getTaskDate(task)).toLocaleTimeString()] })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Button, { size: "sm", children: "Mark Complete" }), _jsx(Button, { variant: "outline", size: "sm", children: "View Map" })] })] }) }, `${task.id}-${task.task_type}`)))) : (_jsx("p", { className: "text-gray-500 text-center py-8", children: "No tasks scheduled for today" })) }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { children: ["Upcoming Tasks (", upcomingTasks.length - todayTasks.length, ")"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-4", children: upcomingTasks.filter(task => !todayTasks.includes(task)).length > 0 ? (upcomingTasks
                                .filter(task => !todayTasks.includes(task))
                                .map((task) => ( // Removed unused index
                            _jsx("div", { className: "p-4 border border-gray-200 rounded-lg", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("h3", { className: "font-medium text-gray-900", children: task.customer_name }), _jsx(Badge, { className: getTaskColor(task.task_type), children: task.task_type })] }), _jsxs("div", { className: "space-y-2 text-sm text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MapPin, { className: "h-4 w-4" }), task.customer_address] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Calendar, { className: "h-4 w-4" }), new Date(getTaskDate(task)).toLocaleDateString()] })] })] }), _jsx(Button, { variant: "outline", size: "sm", children: "View Details" })] }) }, `${task.id}-${task.task_type}`)))) : (_jsx("p", { className: "text-gray-500 text-center py-8", children: "No upcoming tasks" })) }) })] })] }));
};

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/types/supabase';

export type NotificationPriority = 'low' | 'medium' | 'high';
export type NotificationType = 
  | 'new_booking'
  | 'payment_received'
  | 'booking_confirmed'
  | 'driver_assigned'
  | 'delivery_completed'
  | 'delivery_failed'
  | 'booking_rejected';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  booking_id: string | null;
  read_by: string | null;
  is_read: boolean | null;
  read_at: string | null;
  created_at: string | null;
  metadata: Json | null;
}

interface NotificationContextType {
  notifications: AdminNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (notification: Omit<AdminNotification, 'id' | 'created_at'>) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Type cast to handle the generic response
      setNotifications((data || []) as AdminNotification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('admin_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          console.log('New notification received:', payload);
          const newNotification = payload.new as AdminNotification;
          setNotifications((prev) => [newNotification, ...prev]);
          
          // Play a notification sound (optional)
          // new Audio('/notification-sound.mp3').play().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: profile?.id || null,
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile) return;

    try {
      const unreadNotifications = notifications.filter((n) => !n.is_read);
      if (unreadNotifications.length === 0) return;

      const { error } = await supabase
        .from('admin_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: profile.id,
        })
        .in(
          'id',
          unreadNotifications.map((n) => n.id)
        );

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const createNotification = async (
    notification: Omit<AdminNotification, 'id' | 'created_at'>
  ) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from('admin_notifications')
        .insert(notification as any);

      if (error) {
        console.error('Error creating notification:', error);
        return;
      }

      // Refresh to get the created notification with ID
      await fetchNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        createNotification,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Helper function to get priority color
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high':
      return 'text-red-600 bg-red-50';
    case 'medium':
      return 'text-orange-600 bg-orange-50';
    case 'low':
      return 'text-blue-600 bg-blue-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

// Helper function to get notification type icon name
export const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case 'new_booking':
      return 'calendar-plus';
    case 'payment_received':
      return 'credit-card';
    case 'booking_confirmed':
      return 'check-circle';
    case 'driver_assigned':
      return 'truck';
    case 'delivery_completed':
      return 'package-check';
    case 'delivery_failed':
      return 'alert-triangle';
    case 'booking_rejected':
      return 'x-circle';
    default:
      return 'bell';
  }
};
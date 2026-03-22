'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  Trash2,
  Loader2,
  Megaphone,
  FileText,
  GraduationCap,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationsApi } from '@/lib/api';
import { UserNotification, NotificationType } from '@/lib/types';

// Type alias for convenience
type Notification = UserNotification;

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  new_activity: <FileText className="w-5 h-5" />,
  new_quiz: <FileText className="w-5 h-5" />,
  new_exam: <Calendar className="w-5 h-5" />,
  grade_released: <GraduationCap className="w-5 h-5" />,
  course_announcement: <Megaphone className="w-5 h-5" />,
  school_announcement: <Megaphone className="w-5 h-5" />,
  system: <Bell className="w-5 h-5" />,
};

const notificationColors: Record<NotificationType, string> = {
  new_activity: 'bg-blue-100 text-blue-700',
  new_quiz: 'bg-purple-100 text-purple-700',
  new_exam: 'bg-orange-100 text-orange-700',
  grade_released: 'bg-green-100 text-green-700',
  course_announcement: 'bg-navy-100 text-navy-700',
  school_announcement: 'bg-gold-100 text-gold-700',
  system: 'bg-gray-100 text-gray-700',
};

function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications, isLoading, error } = useQuery<UserNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications(),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const filteredNotifications = notifications?.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl">
        <p className="text-red-500">Failed to load notifications. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-navy-800">Notifications</h1>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                : 'No new notifications'}
            </p>
          </div>
          {unreadCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-navy-600 text-white rounded-lg font-medium hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Mark all as read
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-6"
      >
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            filter === 'all'
              ? 'bg-navy-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            filter === 'unread'
              ? 'bg-navy-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          )}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </motion.div>

      {/* Notifications List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {filteredNotifications?.map((notification, index: number) => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'bg-white rounded-xl shadow-card p-4 flex items-start gap-4 group',
                !notification.is_read && 'border-l-4 border-l-navy-500'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  notificationColors[notification.type]
                )}
              >
                {notificationIcons[notification.type]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={cn(
                      'font-medium text-navy-800',
                      !notification.is_read && 'font-semibold'
                    )}
                  >
                    {notification.title}
                  </h3>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {formatNotificationTime(notification.created_at)}
                  </span>
                </div>
                {notification.body && (
                  <p className={cn(
                    'text-sm mt-1',
                    notification.is_read ? 'text-gray-500' : 'text-gray-600'
                  )}>
                    {notification.body}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={markAsReadMutation.isPending}
                    className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notification.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredNotifications?.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500">
              {filter === 'unread'
                ? 'No unread notifications'
                : 'No notifications yet'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

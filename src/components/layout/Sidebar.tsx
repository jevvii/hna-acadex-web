'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useUserRole } from '@/store/auth';
import { cn, getInitials } from '@/lib/utils';
import { notificationsApi } from '@/lib/api';
import type { UserNotification } from '@/lib/types';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';

const studentNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/todos', label: 'To-Do List', icon: CheckSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

const teacherNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const role = useUserRole();
  const { data: notifications } = useQuery<UserNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications(),
  });

  const navItems = role === 'student' ? studentNavItems : teacherNavItems;
  const notificationList: UserNotification[] = Array.isArray(notifications)
    ? notifications
    : (notifications as unknown as { results?: UserNotification[] })?.results ?? [];
  const unreadCount = notificationList.filter((notification) => !notification.is_read).length;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-[var(--border-default)] flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--border-default)]">
        <div className="w-10 h-10 bg-navy-600 rounded-xl flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className="font-display text-xl font-bold text-navy-600">Acadex</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
          Menu
        </p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-navy-600 text-white'
                    : 'text-gray-500 hover:bg-navy-50 hover:text-navy-600'
                )}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {item.href === '/notifications' && unreadCount > 0 && (
                      <span
                        className={cn(
                          'absolute -top-1.5 -right-2 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-[10px] leading-[1.1rem] text-center font-semibold',
                          isActive ? 'bg-white text-navy-700' : 'bg-red-500 text-white'
                        )}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  {item.label}
                </Link>
              );
            })}
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-[var(--border-default)] p-4">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-navy-50 transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-600 to-navy-800 flex items-center justify-center text-white font-semibold text-sm">
            {user?.full_name ? getInitials(user.full_name) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy-800 truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-navy-50 hover:text-navy-600 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <button
            type="button"
            aria-label="Log out of your account"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  CalendarDays,
  Heart,
  DollarSign,
  MessageSquare,
  Home,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/members', label: 'Members', icon: Users },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarDays },
  { href: '/dashboard/follow-up', label: 'Follow-up', icon: Heart },
  { href: '/dashboard/giving', label: 'Giving', icon: DollarSign },
  { href: '/dashboard/cells', label: 'Cell Groups', icon: Home },
  { href: '/dashboard/messaging', label: 'Messaging', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary-700">ChurchSaaS</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

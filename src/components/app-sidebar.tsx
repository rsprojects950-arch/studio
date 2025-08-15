'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { AppLogo } from '@/components/icons/logo';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  ListTodo,
  BookOpen,
  MessageSquare,
  Settings,
  User,
  LogOut,
} from 'lucide-react';

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/todos', label: 'To-Do List', icon: ListTodo },
  { href: '/dashboard/resources', label: 'Resources', icon: BookOpen },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare },
];

const bottomNav = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <AppLogo className="w-8 h-8 text-primary" />
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
            Beyond Theory
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {mainNav.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label, side: 'right' }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          {bottomNav.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: item.label, side: 'right' }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <Separator className="my-1" />
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={{ children: 'Logout', side: 'right' }}>
              <Link href="/">
                <LogOut />
                <span>Logout</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

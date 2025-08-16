
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
  SidebarMenuBadge,
  SidebarTrigger,
  useSidebar,
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
  Target,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/todos', label: 'To-Do List', icon: ListTodo },
  { href: '/dashboard/goals', label: 'Short Term Goals', icon: Target },
  { href: '/dashboard/resources', label: 'Resources', icon: BookOpen },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare, id: 'chat' },
];

const bottomNav = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export function AppSidebarTrigger() {
  const { isMobile } = useSidebar();
  if (isMobile) {
    return (
      <SidebarTrigger className="flex items-center gap-2">
        <AppLogo className="w-6 h-6 text-primary" />
      </SidebarTrigger>
    );
  }
  return null;
}

export function AppSidebar({ userProfile, unreadCount }: { userProfile: UserProfile, unreadCount: number }) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { isMobile } = useSidebar();

  return (
    <Sidebar collapsible={isMobile ? 'offcanvas' : 'icon'}>
      <SidebarHeader className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <AppLogo className="w-8 h-8 text-primary" />
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
            Beyond Theory
          </span>
        </Link>
        <div className="group-data-[collapsible=icon]:hidden">
           <SidebarTrigger />
        </div>
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
                  {item.id === 'chat' && unreadCount > 0 && (
                     <SidebarMenuBadge>{unreadCount}</SidebarMenuBadge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 space-y-2">
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={() => signOut()} tooltip={{ children: 'Logout', side: 'right' }}>
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                    <AvatarImage src={userProfile.photoURL ?? undefined} alt={userProfile.username} data-ai-hint="user portrait" />
                    <AvatarFallback>{userProfile.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="group-data-[collapsible=icon]:hidden">{userProfile.username}</span>
                </div>
                <LogOut className="group-data-[collapsible=icon]:hidden ml-auto"/>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        
        <Separator />
        
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
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

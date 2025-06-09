
"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, BarChart3, Brain, Eye, Settings, ShieldAlert } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/real-time-data', label: 'Real-time Data', icon: Eye },
  { href: '/visualizations', label: 'Visualizations', icon: BarChart3 },
  { href: '/ai-analyzer', label: 'AI Analyzer', icon: Brain },
  { href: '/reinforcement-analysis', label: 'RL Analysis', icon: ShieldAlert },
  // { href: '/settings', label: 'Settings', icon: Settings }, // Settings link removed from main nav
];


export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
        {mainNavItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={{ children: item.label, side: "right", align: "center" }}
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
      <Separator className="my-2" />
       <SidebarGroup>
        <SidebarGroupLabel>Support &amp; Config</SidebarGroupLabel>
         <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip={{ children: "Settings", side: "right", align: "center" }}
            >
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
       </SidebarGroup>
    </SidebarMenu>
  );
}

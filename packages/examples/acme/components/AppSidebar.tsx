"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  {
    "label": "Pipeline",
    "path": "/",
    "icon": "Layers"
  },
  {
    "label": "Leads",
    "path": "/leads",
    "icon": "UserPlus"
  }
] as const;
const PRODUCT_NAME = "CRM";
const CUSTOMER_LABEL: string | null = "Acme";

function NavIcon({ name }: { name: string }) {
  const C = (Icons as Record<string, unknown>)[name] ?? Icons.Circle;
  const Resolved = C as typeof Icons.Circle;
  return <Resolved className="size-4" />;
}

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold leading-tight">{PRODUCT_NAME}</span>
            {CUSTOMER_LABEL ? (
              <span className="truncate text-xs text-muted-foreground leading-tight">{CUSTOMER_LABEL}</span>
            ) : null}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={pathname === item.path}>
                    <Link href={item.path}>
                      <NavIcon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Intentionally empty for now. The section header reserves the
                space so future dynamic links land somewhere that already
                exists in the chrome. */}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

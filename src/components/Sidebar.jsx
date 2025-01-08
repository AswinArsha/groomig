// src/components/Sidebar.jsx

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar as ShadcnSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  LogOut,
  CreditCard,
  BookOpen,
  Home,
  ClipboardList,
  Tag,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "../supabase";

function Sidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const [user, setUser] = useState(null);

  // Fetch user session
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error.message);
      } else if (session) {
        setUser(session.user);
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    }
  };

  const navigationItems = [
    { name: "Home", path: "/dashboard/home", icon: <Home className="w-5 h-5" /> },
    { name: "Bookings", path: "/dashboard/bookings", icon: <ClipboardList className="w-5 h-5" /> },
    { name: "Catalog", path: "/dashboard/catalog", icon: <Tag className="w-5 h-5" /> },
    { name: "Billing", path: "/dashboard/billing", icon: <CreditCard className="w-5 h-5" /> },
  ];

  const isLinkActive = (path) => {
    return location.pathname === path;
  };

  return (
    <TooltipProvider>
      <ShadcnSidebar collapsible="icon" collapsed={isSidebarCollapsed}>
        <SidebarHeader>
          <SidebarTrigger
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="cursor-pointer text-gray-600 hover:text-gray-800"
          >
            {isSidebarCollapsed ? "Expand" : "Collapse"}
          </SidebarTrigger>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  {isSidebarCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          className={`flex items-center ${
                            isLinkActive(item.path) ? "bg-gray-200 dark:bg-gray-800" : ""
                          }`}
                        >
                          <Link to={item.path} className="flex items-center w-full">
                            {item.icon}
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <span>{item.name}</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      className={`flex items-center ${
                        isLinkActive(item.path) ? "bg-gray-200 dark:bg-gray-800" : ""
                      }`}
                    >
                      <Link to={item.path} className="flex items-center w-full">
                        {item.icon}
                        <span className="ml-2">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      
        <SidebarRail />
      </ShadcnSidebar>
    </TooltipProvider>
  );
}

export default Sidebar;

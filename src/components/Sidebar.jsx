// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  Sidebar as ShadcnSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail,
  SidebarFooter, // Import SidebarFooter
} from "@/components/ui/sidebar";
import {
  Home,
  Store,
  BarChart,
  LogOut,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button"; // Import Button for Logout
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Optional: If you want to show user avatar
import toast from "react-hot-toast"; // Import toast for notifications
import { supabase } from "../supabase";

function Sidebar() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate hook
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

  const navigationItems = [
    { name: "Home", path: "/home", icon: <Home className="w-5 h-5" /> },
    { name: "shop", path: "/shop", icon: <Store className="w-5 h-5" /> },
    { name: "Analytics", path: "/analytics", icon: <BarChart className="w-5 h-5" /> },
  ];

  const isLinkActive = (path) => location.pathname === path;

  // Dynamic header text based on current route
  const getHeaderText = () => {
    switch (location.pathname) {
      case "/home":
        return "Home";

      case "/shop":
        return "shop";
      case "/analytics":
        return "Analytics";
      default:
        return "Home"; 
    }
  };
  // Handle Logout Function
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      toast.error(`Error logging out: ${error.message}`);
    } else {
      toast.success("Logged out successfully!");
      navigate("/"); // Redirect to Login Form
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full">
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

          {/* Sidebar Footer with Logout Button */}
          <SidebarFooter className="mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  {!isSidebarCollapsed && "Logout"}
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </ShadcnSidebar>

        <div className="flex-1 flex flex-col w-0">
          <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white px-6">
            <h1 className="text-lg font-semibold tracking-tight">
              {getHeaderText()}
            </h1>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default Sidebar;

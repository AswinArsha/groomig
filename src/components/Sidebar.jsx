// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { 
  Home, 
  Store, 
  BarChart, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  Menu,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { supabase } from "../supabase";
import { AnimatePresence, motion,LayoutGroup  } from "framer-motion";

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
    setShowMobileProfile(false);
  }, [location.pathname]);

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
    { name: "Shop", path: "/shop", icon: <Store className="w-5 h-5" /> },
    { name: "Analytics", path: "/analytics", icon: <BarChart className="w-5 h-5" /> },
  ];

  const isLinkActive = (path) => {
    if (path === '/home') {
      return location.pathname === '/home' || 
             location.pathname.includes('/all-bookings') ||
             location.pathname.includes('/booking') ||
             location.pathname.includes('/all-booking-details');
    }
    return location.pathname === path;
  };

  // Dynamic header text based on current route
  const getHeaderText = () => {
    switch (location.pathname) {
      case "/home":
        return "Home";
      case "/shop":
        return "Shop";
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
      navigate("/");
    }
  };

  // Sidebar animation variants - smoother spring animation
  const sidebarVariants = {
    expanded: {
      width: "200px",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 25,
        duration: 0.3
      }
    },
    collapsed: {
      width: "80px",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 25,
        duration: 0.3
      }
    }
  };

  // Mobile overlay variants - smoother animations
  const overlayVariants = {
    open: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }
    },
    closed: {
      opacity: 0,
      y: "100%",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }
    }
  };

  // Profile drawer animation variants
  const profileDrawerVariants = {
    open: {
      height: "auto",
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }
    },
    closed: {
      height: 0,
      opacity: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3
      }
    }
  };

  // Improved text animation variants
  const textVariants = {
    show: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        duration: 0.3
      }
    },
    hide: {
      opacity: 0,
      x: -10,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        duration: 0.3
      }
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <motion.div 
        className="hidden md:flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm"
        variants={sidebarVariants}
        animate={isCollapsed ? "collapsed" : "expanded"}
        initial={false}
      >
        {/* Logo Section */}
        <div className="px-4 py-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="space-y-1 px-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 ${
                  isLinkActive(item.path)
                    ? "bg-pink-100 dark:bg-pink-900/30"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                style={{ color: isLinkActive(item.path) ? "#c93b7d" : "" }}
              >
                {/* Fixed layout to prevent icon movement during collapse */}
                <div className="relative flex items-center w-full">
                  {/* Position icon absolutely for collapsed state to maintain position */}
                  <div className={`${isCollapsed ? "flex justify-center w-full" : "relative"}`}>
                    <motion.div 
                      layout
                      transition={{ 
                        type: "spring",
                        stiffness: 300, 
                        damping: 30,
                        duration: 0.2
                      }}
                      className="flex-shrink-0"
                    >
                      {React.cloneElement(item.icon, {
                        className: `${isLinkActive(item.path) ? "text-pink-600 dark:text-pink-400" : ""} ${item.icon.props.className}`,
                      })}
                    </motion.div>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        key={`text-${item.name}`}
                        variants={textVariants}
                        initial="hide"
                        animate="show"
                        exit="hide"
                        className="ml-3 font-medium"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <AnimatePresence mode="wait">
            {user && !isCollapsed && (
              <motion.div 
                key="user-profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center mb-4"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium">{user.user_metadata?.full_name || user.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`w-full flex items-center justify-center border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors duration-200 ${
              isCollapsed ? "p-2" : "p-2 py-2"
            }`}
          >
            {/* Fixed logout button layout */}
            <div className={`${isCollapsed ? "flex justify-center w-full" : "relative"}`}>
              <motion.div 
                layout
                transition={{ 
                  type: "spring",
                  stiffness: 300, 
                  damping: 30,
                  duration: 0.2
                }}
              >
                <LogOut className="h-5 w-5" />
              </motion.div>
            </div>
            
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  key="logout-text"
                  variants={textVariants}
                  initial="hide"
                  animate="show"
                  exit="hide"
                  className="ml-2"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white dark:bg-gray-800 dark:border-gray-700 px-6">
        
        
          
          <h1 className="text-lg font-semibold tracking-tight">{getHeaderText()}</h1>
          
          {/* Optional: Right side header content */}
          <div className="ml-auto flex items-center space-x-4">
            {/* Add notifications, profile dropdown, etc. here */}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 pb-24 md:pb-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
  <LayoutGroup>
    <nav className="flex items-center justify-around p-2">
      {navigationItems.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          className="flex flex-col items-center p-2 flex-1"
        >
          <motion.div 
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full relative"
            layout
          >
            {isLinkActive(item.path) && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute inset-0 bg-pink-100 dark:bg-pink-900/30 rounded-full"
                style={{ zIndex: -1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            {React.cloneElement(item.icon, {
              className: `${item.icon.props.className}`,
              style: { color: isLinkActive(item.path) ? "#c93b7d" : "" }
            })}
          </motion.div>
          <span className={`text-xs mt-1 ${ isLinkActive(item.path) ? "text-pink-600 dark:text-pink-400 font-medium" : "text-gray-600 dark:text-gray-400"}`}>
            {item.name}
          </span>
        </Link>
      ))}
      
      {/* User Profile Button */}
      <button
        onClick={() => setShowMobileProfile(!showMobileProfile)}
        className="flex flex-col items-center p-2 flex-1"
      >
        <motion.div 
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-full relative"
          layout
        >
          {showMobileProfile && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute inset-0 bg-pink-100 dark:bg-pink-900/30 rounded-full"
              style={{ zIndex: -1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <User className="w-5 h-5" style={{ color: showMobileProfile ? "#c93b7d" : "" }} />
        </motion.div>
        <span className={`text-xs mt-1 ${ showMobileProfile ? "text-pink-600 dark:text-pink-400 font-medium" : "text-gray-600 dark:text-gray-400"}`}>
          Profile
        </span>
      </button>
    </nav>
  </LayoutGroup>
  
  {/* Mobile Profile Drawer remains unchanged */}
  <AnimatePresence>
    {showMobileProfile && (
      <motion.div
        variants={profileDrawerVariants}
        initial="closed"
        animate="open"
        exit="closed"
        className="overflow-hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
      >
        {user && (
          <div className="p-4">
            <div className="flex items-center mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{user.user_metadata?.full_name || user.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full flex items-center justify-center border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors duration-200"
            >
              <LogOut className="h-5 w-5 mr-2" />
              <span>Logout</span>
            </Button>
          </div>
        )}
      </motion.div>
    )}
  </AnimatePresence>
</div>
      
      {/* Mobile Drawer Sidebar (for legacy support) */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="fixed inset-0 bg-gray-800/50 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-800 z-50 md:hidden border-r border-gray-200 dark:border-gray-700 flex flex-col"
        variants={overlayVariants}
        initial="closed"
        animate={isMobileOpen ? "open" : "closed"}
      >
        <div className="px-4 py-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="font-bold text-xl" style={{ color: "#c93b7d" }}></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(false)}
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="space-y-1 px-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 ${
                  isLinkActive(item.path)
                    ? "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {React.cloneElement(item.icon, {
                  className: `${item.icon.props.className}`,
                  style: { color: isLinkActive(item.path) ? "#c93b7d" : "" }
                })}
                <span className="ml-3 font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {user && (
            <div className="flex items-center mb-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium">{user.user_metadata?.full_name || user.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center justify-center border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-2">Logout</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default Sidebar;
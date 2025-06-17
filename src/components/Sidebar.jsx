import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  Calendar,
  Store,
  BarChart,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu, Loader2, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { supabase } from "../supabase";
import { AnimatePresence, motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import MobileSidebar from "@/components/ui/mobile-sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import './App.css';

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  // Fetch user session and subscription details
  useEffect(() => {
    // Check for stored session
    const storedSession = localStorage.getItem('userSession');
    if (storedSession) {
      const parsedUser = JSON.parse(storedSession);
      setUser(parsedUser);

      // Fetch subscription details
      const fetchSubscription = async () => {
        setLoadingSubscription(true);
        try {
          const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', parsedUser.organization_id)
            .order('subscription_end_date', { ascending: false })
            .limit(1)
            .single();

          if (error) throw error;
          setSubscriptionDetails(data);
        } catch (error) {
          console.error('Error fetching subscription:', error);
          toast.error('Failed to load subscription details');
        } finally {
          setLoadingSubscription(false);
        }
      };

      fetchSubscription();
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('userSession');
          setUser(null);
          setSubscriptionDetails(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch subscription history when dialog opens
  useEffect(() => {
    if (showHistory && user?.organization_id) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const { data, error } = await supabase
            .from('subscription_history')
            .select('*')
            .eq('organization_id', user.organization_id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setSubscriptionHistory(data || []);
        } catch (error) {
          console.error('Error fetching subscription history:', error);
          toast.error('Failed to load subscription history');
        } finally {
          setLoadingHistory(false);
        }
      };

      fetchHistory();
    }
  }, [showHistory, user?.organization_id]);

  const navigationItems = [
    { name: "Bookings", path: "/home", icon: <Calendar className="w-5 h-5" /> },
    { name: "Shop", path: "/shop", icon: <Store className="w-5 h-5" /> },
    { name: "Analytics", path: "/analytics", icon: <BarChart className="w-5 h-5" /> },
  ];
  
  // Check if subscription is inactive
  const isSubscriptionInactive = subscriptionDetails?.subscription_status !== 'active';

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
    if (user?.type === 'admin') {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error.message);
        toast.error(`Error logging out: ${error.message}`);
        return;
      }
    }
    localStorage.removeItem('userSession');
    toast.success("Logged out successfully!");
    navigate("/");
  };

  // Helper function to get the display name
  const getDisplayName = () => {
    // staff session: might have data.name
    if (user?.type === 'staff') {
      return user.data?.name ?? user.username ?? '';
    }
    // admin (or other) session
    return user?.user_metadata?.full_name
        || user?.username
        || '';
  };
  

  // Helper function to get the role
  const getRole = () => {
    if (user?.type === 'staff') {
      // guard against missing .data or .role
      return user.data?.role ?? 'Staff';
    }
    // all non-staff users are admins
    return 'Admin';
  };
  

  // Helper function to get the first letter for avatar
  const getAvatarLetter = () => {
    // staff
    if (user?.type === 'staff') {
      const n = user.data?.name ?? user.username ?? '';
      return n.charAt(0).toUpperCase();
    }
    // admin
    const n = user?.user_metadata?.full_name
           || user?.username
           || '';
    return n.charAt(0).toUpperCase();
  };
  


  // Sidebar animation variants - enhanced spring animation
  const sidebarVariants = {
    expanded: {
      width: "200px",
      transition: {
        type: "spring",
        stiffness: 250,
        damping: 22,
        mass: 1,
        velocity: 0
      }
    },
    collapsed: {
      width: "80px",
      transition: {
        type: "spring",
        stiffness: 250,
        damping: 22,
        mass: 1,
        velocity: 0
      }
    }
  };

  // Mobile overlay variants - enhanced animations
  const overlayVariants = {
    open: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 28,
        mass: 0.8,
        velocity: 2
      }
    },
    closed: {
      opacity: 0,
      y: "100%",
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 28,
        mass: 0.8,
        velocity: 2
      }
    }
  };

  // Profile drawer animation variants - enhanced
  const profileDrawerVariants = {
    open: {
      height: "auto",
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 26,
        mass: 0.9,
        velocity: 2
      }
    },
    closed: {
      height: 0,
      opacity: 0,
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 26,
        mass: 0.9,
        velocity: 2
      }
    }
  };

  // Enhanced text animation variants
  const textVariants = {
    show: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 550,
        damping: 28,
        mass: 0.7,
        velocity: 2
      }
    },
    hide: {
      opacity: 0,
      x: -10,
      transition: {
        type: "spring",
        stiffness: 550,
        damping: 28,
        mass: 0.7,
        velocity: 2
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
            <motion.div
              initial={false}
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <ChevronRight className="h-5 w-5" />
            </motion.div>
          </Button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 overflow-y-auto">
          <nav className="space-y-1 px-2">
            {navigationItems.map((item) => (
              <TooltipProvider key={item.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={isSubscriptionInactive ? "#" : item.path}
                      onClick={(e) => isSubscriptionInactive && e.preventDefault()}
                      className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 ${isLinkActive(item.path)
                          ? "bg-pink-100 dark:bg-pink-900/30"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        } ${isSubscriptionInactive ? "opacity-50 cursor-not-allowed" : ""}`}
                      style={{ color: isLinkActive(item.path) ? "#c93b7d" : "" }}
                    >
                      {/* Fixed layout to prevent icon movement during collapse */}
                      <div className="relative flex items-center w-full">
                        {/* Position icon absolutely for collapsed state to maintain position */}
                        <div className={`${isCollapsed ? "flex justify-center w-full" : "relative"}`}>
                          <motion.div
                            layout
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 25,
                              mass: 0.8,
                              velocity: 2
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
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-white">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </nav>
        </div>

    {/* User Profile & Logout */}
<div className="border-t border-gray-200 dark:border-gray-700 p-4">
  <AnimatePresence mode="wait">
    {user && (
      <motion.div
        key="user-profile"
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 25,
          mass: 0.8,
          velocity: 2
        }}
        className={`flex items-center mb-4 ${
          isCollapsed ? 'justify-center' : ''
        }`}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Avatar className="h-9 w-9 cursor-pointer ring-1 ring-pink-400 hover:ring-2 hover:ring-pink-500 transition-all duration-200">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback>
                {getAvatarLetter()}
              </AvatarFallback>
            </Avatar>
          </PopoverTrigger>
         <PopoverContent className="max-w-sm ml-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                          Subscription Details
                        </h4>
                        <Button variant="ghost" size="icon" onClick={() => setShowHistory(true)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {loadingSubscription ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                        </div>
                      ) : subscriptionDetails ? (
                        <div className="space-y-3">
                          {/* Status Row */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                            <span
                              className={`inline-flex items-center text-sm font-medium ${subscriptionDetails.subscription_status === 'active'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                                }`}
                            >
                              {subscriptionDetails.subscription_status === 'active' ? (
                                <CheckCircle className="mr-1 h-4 w-4" />
                              ) : (
                                <XCircle className="mr-1 h-4 w-4" />
                              )}
                              {subscriptionDetails.subscription_status.charAt(0).toUpperCase() +
                                subscriptionDetails.subscription_status.slice(1)}
                            </span>
                          </div>

                          {/* Expiry Row */}
                          {subscriptionDetails.subscription_end_date && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Expires</span>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {new Date(subscriptionDetails.subscription_end_date).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                          No subscription details available
                        </p>
                      )}
                    </div>
                  </PopoverContent>

                  {/* Subscription History Dialog */}
                  <Dialog open={showHistory} onOpenChange={setShowHistory}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Subscription History</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                        {loadingHistory ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                          </div>
                        ) : subscriptionHistory.length > 0 ? (
                          <div className="overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Plan</th>
                                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Expires</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {subscriptionHistory.map((history, index) => (
                                  <tr key={index}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                                      {new Date(history.created_at).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                      {history.plan_name || 'N/A'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                      {history.end_date ? new Date(history.end_date).toLocaleDateString('en-GB') : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                            No subscription history available
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
              </Popover>

        {/* only show name & role when expanded */}
        {!isCollapsed && (
          <div className="ml-3">
            <p className="text-sm font-medium">{getDisplayName()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getRole()}
            </p>
          </div>
        )}
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
    <div className={`${isCollapsed ? "flex justify-center w-full" : "relative"}`}>
      <motion.div
        layout
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25, 
          mass: 0.8,
          velocity: 2 
        }}
      >
        <LogOut className="h-5 w-5" />
      </motion.div>
    </div>
    {!isCollapsed && (
      <AnimatePresence mode="wait">
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
      </AnimatePresence>
    )}
  </Button>
</div>


      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-0 overflow-hidden">
        <header className=" hidden md:flex h-16 shrink-0 items-center gap-4 border-b dark:border-gray-700 px-6 ">
          <h1 className="text-lg font-semibold tracking-tight">{getHeaderText()}</h1>

          {/* Optional: Right side header content */}
          <div className="ml-auto flex items-center space-x-4">
            {/* Add notifications, profile dropdown, etc. here */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6 home-wrapper">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileSidebar
        user={user}
        navigationItems={navigationItems}
        isLinkActive={isLinkActive}
        showMobileProfile={showMobileProfile}
        setShowMobileProfile={setShowMobileProfile}
        handleLogout={handleLogout}
        profileDrawerVariants={profileDrawerVariants}
        getDisplayName={getDisplayName}
        getRole={getRole}
        getAvatarLetter={getAvatarLetter}
      />

   
    </div>
  );
}

export default Sidebar;
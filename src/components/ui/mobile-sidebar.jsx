import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, User, ChevronUp, ChevronRight, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "../../supabase";

const MobileSidebar = ({
  user,
  navigationItems,
  isLinkActive,
  showMobileProfile,
  setShowMobileProfile,
  handleLogout,
  getDisplayName,
  getRole,
  getAvatarLetter
}) => {
  // Local state for touch feedback and subscription
  const [touchedItem, setTouchedItem] = useState(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  // Fetch subscription details
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;

      setLoadingSubscription(true);
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .single();

        if (error) throw error;
        setSubscriptionDetails(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // Enhanced animation variants
  const profileDrawerVariants = {
    closed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
        opacity: { duration: 0.2 }
      }
    },
    open: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] },
        opacity: { duration: 0.3, delay: 0.1 }
      }
    }
  };

  // Staggered animation for nav items
  const navContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  // Animation for individual navigation items
  const navItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20
      }
    }
  };

  // Handle touch start for haptic-like feedback
  const handleTouchStart = (itemName) => {
    setTouchedItem(itemName);
  };

  // Handle touch end to reset state
  const handleTouchEnd = () => {
    setTouchedItem(null);
  };

  return (
 // make sure you have these at the top of Sidebar.jsx:

<div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 shadow-lg">
  <motion.nav
    className="flex items-center justify-around px-1 py-2"
    variants={navContainerVariants}
    initial="hidden"
    animate="visible"
  >
    {navigationItems.map((item) => (
      <motion.div
        key={item.name}
        variants={navItemVariants}
        className="flex-1 min-w-[64px]"
      >
        <Link
          to={item.path}
          className="flex flex-col items-center px-2 py-1"
        >
          <motion.div
            whileTap={{ scale: 0.85 }}
            className={`p-2.5 rounded-full relative ${
              touchedItem === item.name ? "bg-pink-50 dark:bg-pink-900/20" : ""
            }`}
            onTouchStart={() => handleTouchStart(item.name)}
            onTouchEnd={handleTouchEnd}
          >
            {isLinkActive(item.path) && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute inset-0 bg-pink-100 dark:bg-pink-900/30 rounded-full"
                style={{ zIndex: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.2 }}
              />
            )}
            {React.cloneElement(item.icon, {
              className: `w-6 h-6 ${
                isLinkActive(item.path)
                  ? "text-pink-600 dark:text-pink-400"
                  : "text-gray-600 dark:text-gray-400"
              }`,
            })}
          </motion.div>
          <motion.span
            className={`text-xs mt-1 font-medium ${
              isLinkActive(item.path)
                ? "text-pink-600 dark:text-pink-400"
                : "text-gray-600 dark:text-gray-400"
            }`}
            animate={{ opacity: isLinkActive(item.path) ? 1 : 0.85 }}
          >
            {item.name}
          </motion.span>
        </Link>
      </motion.div>
    ))}

    {/* User Avatar Button */}
    <motion.div variants={navItemVariants} className="flex-1 min-w-[64px]">
      <button
        onClick={() => setShowMobileProfile(!showMobileProfile)}
        className="flex flex-col items-center px-2 py-1 w-full"
        onTouchStart={() => handleTouchStart("profile")}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div
          whileTap={{ scale: 0.85 }}
          className={` rounded-full relative ${
            touchedItem === "profile" ? "bg-pink-50 dark:bg-pink-900/20" : ""
          }`}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {showMobileProfile && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute inset-0 bg-pink-100 dark:bg-pink-900/30 rounded-full "
              style={{ zIndex: -1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30, bounce: 0.2 }}
            />
          )}
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback>{getAvatarLetter()}</AvatarFallback>
          </Avatar>
        </motion.div>
        <motion.span
          className={`text-xs mt-1 font-medium ${
            showMobileProfile ? "text-pink-600 dark:text-pink-400" : "text-gray-600 dark:text-gray-400"
          }`}
          animate={{ opacity: showMobileProfile ? 1 : 0.85 }}
        >
          Profile
        </motion.span>
      </button>
    </motion.div>
  </motion.nav>

  {/* Mobile Profile Drawer */}
  <AnimatePresence>
    {showMobileProfile && (
      <motion.div
        variants={profileDrawerVariants}
        initial="closed"
        animate="open"
        exit="closed"
        className="overflow-hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
      >
        {user && (
          <div className="p-4 space-y-6">
            {/* Avatar + Name/Role */}
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12 ring-2 ring-pink-100 dark:ring-pink-900/40">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>{getAvatarLetter()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getRole()}
                </p>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Subscription Details
              </h4>
              {loadingSubscription ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-pink-600" />
                </div>
              ) : subscriptionDetails ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                    <span
                      className={`inline-flex items-center text-sm font-medium ${
                        subscriptionDetails.subscription_status === "active"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {subscriptionDetails.subscription_status === "active" ? (
                        <CheckCircle className="mr-1 h-4 w-4" />
                      ) : (
                        <XCircle className="mr-1 h-4 w-4" />
                      )}
                      {subscriptionDetails.subscription_status.charAt(0).toUpperCase() +
                        subscriptionDetails.subscription_status.slice(1)}
                    </span>
                  </div>
                  {subscriptionDetails.subscription_end_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Expires</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {new Date(subscriptionDetails.subscription_end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No subscription details available
                </p>
              )}
            </div>

            {/* Logout */}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full flex items-center justify-center h-10 space-x-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Logout</span>
            </Button>
          </div>
        )}
      </motion.div>
    )}
  </AnimatePresence>
</div>

  );
};

export default MobileSidebar;
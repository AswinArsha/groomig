import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion ,AnimatePresence  } from "framer-motion";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import {
  LogOut,
  Loader2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
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
  const [touchedItem, setTouchedItem] = useState(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch subscription history when drawer opens
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

  // Fetch subscription details
  useEffect(() => {
    if (!user) return;
    const fetchSubscription = async () => {
      setLoadingSubscription(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", user.organization_id)
          .single();
        if (error) throw error;
        setSubscriptionDetails(data);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoadingSubscription(false);
      }
    };
    fetchSubscription();
  }, [user]);

  // Animation variants
  const navContainerVariants = {
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
    hidden: {}
  };
  const navItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };
  const profileDrawerVariants = {
    hidden: { opacity: 0, y: "100%" },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 280, damping: 30 }
    }
  };

  const handleTouchStart = (name) => setTouchedItem(name);
  const handleTouchEnd  = ()   => setTouchedItem(null);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 shadow-lg">

      {/* Bottom nav */}
      <motion.nav
        layout
        className="flex items-center justify-around px-1 py-2"
        variants={navContainerVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        {navigationItems.map((item) => (
          <motion.div
            key={item.name}
            layout
            whileHover={{ scale: 1.1 }}
            variants={navItemVariants}
            className="flex-1 min-w-[64px] transition-transform"
          >
            <Link to={item.path} className="flex flex-col items-center px-2 py-1">
              <motion.div
                whileTap={{ scale: 0.85 }}
                className={`p-2.5 rounded-full relative ${
                  touchedItem === item.name ? "bg-pink-50 dark:bg-pink-900/20" : ""
                }`}
                onTouchStart={() => handleTouchStart(item.name)}
                onTouchEnd={handleTouchEnd}
              >
                <AnimatePresence>
                  {isLinkActive(item.path) && (
                    <motion.div
                      key="indicator"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 bg-pink-100 dark:bg-pink-900/30 rounded-full"
                      style={{ zIndex: -1 }}
                    />
                  )}
                </AnimatePresence>

                {React.cloneElement(item.icon, {
                  className: `w-6 h-6 ${
                    isLinkActive(item.path)
                      ? "text-pink-600 dark:text-pink-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`
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

        {/* Profile toggle */}
        <motion.div variants={navItemVariants} className="flex-1 min-w-[64px]">
          <button
            onClick={() => setShowMobileProfile(!showMobileProfile)}
            className="flex flex-col items-center px-2 py-1 w-full"
            onTouchStart={() => handleTouchStart("profile")}
            onTouchEnd={handleTouchEnd}
          >
            <motion.div
              whileTap={{ scale: 0.85 }}
              className={`rounded-full relative ${
                touchedItem === "profile" ? "bg-pink-50 dark:bg-pink-900/20" : ""
              }`}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <AnimatePresence>
                {showMobileProfile && (
                  <motion.div
                    key="indicator-profile"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-pink-100 dark:bg-pink-900/30 rounded-full"
                    style={{ zIndex: -1 }}
                  />
                )}
              </AnimatePresence>

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

      {/* Profile drawer */}
      <Drawer open={showMobileProfile && !showHistory} onOpenChange={setShowMobileProfile}>
        <DrawerContent>
              {user && (
                <div className="p-4 space-y-6">
                  {/* Avatar + Name */}
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
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Status
                          </span>
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
                            {subscriptionDetails.subscription_status
                              .charAt(0)
                              .toUpperCase() +
                              subscriptionDetails.subscription_status.slice(1)}
                          </span>
                        </div>
                        {subscriptionDetails.subscription_end_date && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Expires
                            </span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                              {new Date(
                                subscriptionDetails.subscription_end_date
                              ).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        )}

                        {/* Subscription History Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => {
                            setShowHistory(true);
                            setShowMobileProfile(false);
                          }}
                        >
                          View History
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No subscription details available
                      </p>
                    )}
                  </div>

                  {/* Logout Button */}
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
            </DrawerContent>
          </Drawer>

          {/* Subscription History Drawer */}
          <Drawer open={showHistory} onOpenChange={setShowHistory}>
            <DrawerContent>
              <div className="flex flex-col h-[80vh]">
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    Subscription History
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto px-4">
                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                    </div>
                  ) : subscriptionHistory.length > 0 ? (
                    <div className="space-y-3 pb-4">
                      {subscriptionHistory.map((history) => (
                        <div
                          key={history.id}
                          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base font-medium text-gray-800 dark:text-gray-200">
                              {history.plan_name}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(history.start_date).toLocaleDateString('en-GB')} - {history.end_date ? new Date(history.end_date).toLocaleDateString('en-GB') : 'Present'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No subscription history available
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowHistory(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
    </div>
  );
};

export default MobileSidebar;

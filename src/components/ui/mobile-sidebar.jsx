import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
 } from "@/components/ui/drawer";
import {
  LogOut,
  Loader2,
  CheckCircle,
  XCircle , History, Settings 
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "../../supabase";
import Preferences from "@/components/Catalog/Preferences";

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
  const [prefOpen, setPrefOpen] = useState(false);

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

  // Enhanced animation variants
  const navContainerVariants = {
    visible: { 
      transition: { 
        staggerChildren: 0.06,
        delayChildren: 0.08,
        staggerDirection: 1,
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.8,
        velocity: 2
      } 
    },
    hidden: {}
  };
  const navItemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9, rotate: -5 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: { 
        type: "spring", 
        stiffness: 450, 
        damping: 20,
        mass: 0.7,
        velocity: 3
      }
    }
  };
  const profileDrawerVariants = {
    hidden: { opacity: 0, y: "100%", scale: 0.95, rotateX: 5 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      transition: { 
        type: "spring", 
        stiffness: 380, 
        damping: 24,
        mass: 0.8,
        velocity: 3
      }
    }
  };

  const handleTouchStart = (name) => setTouchedItem(name);
  const handleTouchEnd  = ()   => setTouchedItem(null);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 shadow-lg">



{/* Bottom nav */}
<motion.nav
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
  className="flex items-center justify-around px-1 py-2"
>
  {navigationItems.map((item) => (
    <motion.div
      key={item.name}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
      className="flex-1 min-w-[64px]"
    >
      <Link to={item.path} className="flex flex-col items-center px-2 py-1">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative p-2.5 rounded-full"
        >
          <AnimatePresence>
            {isLinkActive(item.path) && (
              <motion.div
                key="indicator"
                initial={{ scale: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="absolute inset-0 bg-[hsl(var(--primary)/0.15)] dark:bg-[hsl(var(--primary)/0.25)] rounded-full"
                style={{ zIndex: -1 }}
              />
            )}
          </AnimatePresence>

          {React.cloneElement(item.icon, {
            className: `w-6 h-6 ${
              isLinkActive(item.path)
                ? "text-[hsl(var(--primary))] dark:text-[hsl(var(--primary))]"
                : "text-gray-600 dark:text-gray-400"
            }`
          })}
        </motion.div>

        <motion.span
          initial={{ opacity: 0.7 }}
          animate={{ opacity: isLinkActive(item.path) ? 1 : 0.8 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`text-xs mt-1 font-medium ${
            isLinkActive(item.path)
              ? "text-[hsl(var(--primary))] dark:text-[hsl(var(--primary))]"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {item.name}
        </motion.span>
      </Link>
    </motion.div>
  ))}

  {/* Profile toggle */}
  <motion.div
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
    className="flex-1 min-w-[64px]"
  >
    <button
      onClick={() => setShowMobileProfile(!showMobileProfile)}
      className="flex flex-col items-center px-2 py-1 w-full"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative rounded-full"
      >
        <AnimatePresence>
          {showMobileProfile && (
            <motion.div
              key="indicator-profile"
              initial={{ scale: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="absolute inset-0 bg-[hsl(var(--primary)/0.15)] dark:bg-[hsl(var(--primary)/0.25)] rounded-full"
              style={{ zIndex: -1 }}
            />
          )}
        </AnimatePresence>

        <Avatar className="h-12 w-12 ring-1 ring-[hsl(var(--sidebar-primary))] hover:ring-2 hover:ring-[hsl(var(--sidebar-ring))] transition-all duration-200">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
            {getAvatarLetter()}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      <motion.span
        initial={{ opacity: 0.7 }}
        animate={{
          opacity: showMobileProfile ? 1 : 0.8
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`text-xs mt-1 font-medium ${
          showMobileProfile
            ? "text-[hsl(var(--primary))] dark:text-[hsl(var(--primary))]"
            : "text-gray-600 dark:text-gray-400"
        }`}
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
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    mass: 0.8 
                  }}
                  className="p-4 space-y-6">
                  {/* Avatar + Name */}
              <div className="flex justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12 ring-2 ring-[hsl(var(--sidebar-primary)/0.3)] dark:ring-[hsl(var(--sidebar-primary)/0.4)]">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">{getAvatarLetter()}</AvatarFallback>
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
                <div className="flex space-x-4">
                  {/* Subscription History Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setShowHistory(true);
                      setShowMobileProfile(false);
                    }}
                    aria-label="View History"
                  >
                    <History className="h-5 w-5" />
                  </Button>

                  {/* Preferences button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setPrefOpen(true);
                      setShowMobileProfile(false);
                    }}
                    aria-label="Preferences"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </div>
              </div>
                  {/* Subscription Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Subscription Details
                    </h4>
                    {loadingSubscription ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" />
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
                </motion.div>
              )}
            </DrawerContent>
          </Drawer>

     {/* 3️⃣ Preferences Drawer */}
     <Drawer open={prefOpen} onOpenChange={setPrefOpen}>
       {/* No need for a trigger here, since we open it programmatically */}
       <DrawerContent>
         <DrawerHeader>
           <DrawerTitle>Shop Preferences</DrawerTitle>
          
         </DrawerHeader>

         {/* 4️⃣ Embed your Preferences component */}
         <Preferences />

         <DrawerFooter className="flex justify-end space-x-2">
           <DrawerClose asChild>
             <Button variant="outline">Close</Button>
           </DrawerClose>
         </DrawerFooter>
       </DrawerContent>
     </Drawer>


          {/* Subscription History Drawer */}
          <Drawer open={showHistory} onOpenChange={setShowHistory}>
            <DrawerContent>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 380,
                  damping: 24,
                  mass: 0.8 
                }}
                className="flex flex-col h-[80vh]">
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    Subscription History
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto px-4">
                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
                    </div>
                  ) : subscriptionHistory.length > 0 ? (
                    <div className="space-y-3 pb-4">
                      {subscriptionHistory.map((history, index) => (
                        <motion.div
                          key={history.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                            mass: 0.8,
                            delay: index * 0.1
                          }}
                          whileHover={{ scale: 1.02, x: 4 }}
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
                        </motion.div>
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
              </motion.div>
            </DrawerContent>
          </Drawer>
    </div>
  );
};

export default MobileSidebar;

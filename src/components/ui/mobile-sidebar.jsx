import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, User, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  // Local state for touch feedback
  const [touchedItem, setTouchedItem] = useState(null);
  
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
              className="flex flex-col items-center px-2 py-1 relative touch-manipulation"
              onTouchStart={() => handleTouchStart(item.name)}
              onTouchEnd={handleTouchEnd}
            >
              <motion.div 
                whileTap={{ scale: 0.85 }}
                className={`p-2.5 rounded-full relative ${touchedItem === item.name ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20
                }}
              >
                {isLinkActive(item.path) && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-pink-100 dark:bg-pink-900/30 rounded-full"
                    style={{ zIndex: -1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400, 
                      damping: 30,
                      bounce: 0.2
                    }}
                  />
                )}
                <motion.div
                  animate={{
                    scale: isLinkActive(item.path) ? 1.1 : 1
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 25
                  }}
                >
                  {React.cloneElement(item.icon, {
                    className: `w-6 h-6 ${isLinkActive(item.path) ? "text-pink-600 dark:text-pink-400" : "text-gray-600 dark:text-gray-400"} transition-colors duration-200`,
                    style: { color: isLinkActive(item.path) ? "#db2777" : "" }
                  })}
                </motion.div>
              </motion.div>
              
              <motion.span 
                className={`text-xs mt-1 font-medium ${isLinkActive(item.path) ? "text-pink-600 dark:text-pink-400" : "text-gray-600 dark:text-gray-400"}`}
                animate={{
                  opacity: isLinkActive(item.path) ? 1 : 0.85
                }}
              >
                {item.name}
              </motion.span>
            </Link>
          </motion.div>
        ))}
        
        {/* User Profile Button */}
        <motion.div 
          variants={navItemVariants}
          className="flex-1 min-w-[64px]"
        >
          <button
            onClick={() => setShowMobileProfile(!showMobileProfile)}
            className="flex flex-col items-center px-2 py-1 w-full touch-manipulation"
            onTouchStart={() => handleTouchStart("profile")}
            onTouchEnd={handleTouchEnd}
          >
            <motion.div 
              whileTap={{ scale: 0.85 }}
              className={`p-2.5 rounded-full relative ${touchedItem === "profile" ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
            >
              {showMobileProfile && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-pink-100 dark:bg-pink-900/30 rounded-full"
                  style={{ zIndex: -1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 30,
                    bounce: 0.2
                  }}
                />
              )}
              <motion.div
                animate={{
                  scale: showMobileProfile ? 1.1 : 1,
                  rotate: showMobileProfile ? 0 : 0
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 25
                }}
              >
                {showMobileProfile ? 
                  <User className="w-6 h-6 text-pink-600 dark:text-pink-400 transition-colors duration-200" /> :
                  <User className="w-6 h-6 text-gray-600 dark:text-gray-400 transition-colors duration-200" />
                }
              </motion.div>
            </motion.div>
            
            <div className="relative mt-1">
              <motion.span 
                className={`text-xs font-medium ${showMobileProfile ? "text-pink-600 dark:text-pink-400" : "text-gray-600 dark:text-gray-400"}`}
                animate={{
                  opacity: showMobileProfile ? 1 : 0.85
                }}
              >
                Profile
              </motion.span>
              
              {showMobileProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -right-4 -top-1"
                >
                  <ChevronUp size={12} className="text-pink-600 dark:text-pink-400" />
                </motion.div>
              )}
            </div>
          </button>
        </motion.div>
      </motion.nav>

      {/* Mobile Profile Drawer with enhanced animations */}
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
              <motion.div 
                className="p-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: 0.1, duration: 0.3 }
                }}
              >
                <motion.div 
                  className="flex items-center mb-5"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ 
                    x: 0, 
                    opacity: 1,
                    transition: { delay: 0.2, duration: 0.3 }
                  }}
                >
                  <Avatar className="h-12 w-12 ring-2 ring-pink-100 dark:ring-pink-900/40">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                      {getAvatarLetter()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {getDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getRole()}
                    </p>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ 
                    y: 0, 
                    opacity: 1,
                    transition: { delay: 0.3, duration: 0.3 }
                  }}
                >
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full flex items-center justify-center bg-white dark:bg-gray-800 border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200 h-11 rounded-lg shadow-sm"
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="font-medium">Logout</span>
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileSidebar;
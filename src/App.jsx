// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import LoginForm from "./components/LoginForm";
import Sidebar from "./components/Sidebar";
import Home from "./components/Home";
import Shop from "./components/Catalog";
import Analytics from "./components/Analytics";
import NotFound from "./components/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import ManageTimeSlotsPage from "./components/Home/ManageTimeSlotsPage";
import BookingDetails from "./components/Home/BookingDetails";
import AllBookingsPage from "./components/Home/AllBookingsPage";
import AllBookingDetails from "./components/Home/AllBookingDetails"; 
import toast, { Toaster } from "react-hot-toast";
import { useSubscriptionValidator } from "./hooks/useSubscriptionValidator.jsx";
import SubscriptionValidator from "./components/SubscriptionValidator";
import { useIsMobile } from "./hooks/use-mobile";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// Import the new user components
import UserBookingForm from "./components/User/UserBookingForm";
import UserLayout from "./components/User/UserLayout";

// Import Super Admin components
import SuperAdminLogin from "./components/SuperAdmin/SuperAdminLogin";
import SuperAdminDashboard from "./components/SuperAdmin/SuperAdminDashboard";
import SuperAdminProtectedRoute from "./components/SuperAdmin/SuperAdminProtectedRoute";

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Create a new component to house the logic that needs to be within Router context
function AppContent() {
  const subscriptionValidatorModal = useSubscriptionValidator();
  const [organizationId, setOrganizationId] = useState(null);
  const [themeLoaded, setThemeLoaded] = useState(false);
  
  // Monitor organization_id changes
  useEffect(() => {
    const checkOrganizationId = () => {
      const storedOrgId = localStorage.getItem("organization_id");
      const userSession = localStorage.getItem("userSession");
      
      let orgId = storedOrgId;
      
      // Also check userSession if organization_id is not directly available
      if (!orgId && userSession) {
        try {
          const session = JSON.parse(userSession);
          orgId = session.organization_id;
        } catch (error) {
          console.error("Error parsing userSession:", error);
        }
      }
      
      if (orgId && orgId !== organizationId) {
        setOrganizationId(orgId);
      }
    };
    
    // Check immediately
    checkOrganizationId();
    
    // Also check when storage changes (for when user logs in)
    window.addEventListener('storage', checkOrganizationId);
    
    // Set up an interval to check periodically (fallback)
    const interval = setInterval(checkOrganizationId, 1000);
    
    return () => {
      window.removeEventListener('storage', checkOrganizationId);
      clearInterval(interval);
    };
  }, [organizationId]);
  
  // Helper function to convert hex to HSL
  const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  // Helper function to apply custom theme
  const applyCustomTheme = (color) => {
    const [h, s, l] = hexToHsl(color);
    const root = document.documentElement;
    
    // Apply custom CSS variables
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--primary-foreground', '210 40% 98%');
    root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
    root.style.setProperty('--chart-1', `${h} ${s}% ${l}%`);
    root.style.setProperty('--chart-2', `${h} ${Math.max(s - 20, 30)}% ${Math.max(l - 10, 40)}%`);
    root.style.setProperty('--sidebar-primary', `${h} ${s}% ${Math.max(l - 10, 30)}%`);
    root.style.setProperty('--sidebar-ring', `${h} ${s}% ${Math.max(l - 15, 25)}%`);
  };

  // Load theme preference when organization_id is available
  useEffect(() => {
    if (!organizationId || themeLoaded) return;
    
    const loadThemePreference = async () => {
      try {
        console.log("Loading theme for organization:", organizationId);
        
        // Fetch theme preference from Supabase
        const { data, error } = await supabase
          .from("theme_preferences")
          .select("theme_color, custom_color")
          .eq("organization_id", organizationId)
          .single();
        
        if (error && error.code !== "PGRST116") { // PGRST116 means no rows returned
          console.error("Error fetching theme preference:", error);
          // Default to default theme if there's an error
          document.documentElement.setAttribute("data-theme", "default");
          setThemeLoaded(true);
          return;
        }
        
        if (data && data.theme_color) {
          console.log("Applying theme:", data.theme_color);
          
          if (data.theme_color === 'custom' && data.custom_color) {
            // Apply custom theme
            document.documentElement.setAttribute("data-theme", "custom");
            applyCustomTheme(data.custom_color);
          } else {
            // Apply predefined theme
            document.documentElement.setAttribute("data-theme", data.theme_color);
          }
        } else {
          console.log("No theme preference found, using default");
          // Default to default theme if no preference is found
          document.documentElement.setAttribute("data-theme", "default");
        }
        
        setThemeLoaded(true);
      } catch (error) {
        console.error("Error in theme loading:", error);
        // Default to default theme if there's an exception
        document.documentElement.setAttribute("data-theme", "default");
        setThemeLoaded(true);
      }
    };
    
    loadThemePreference();
  }, [organizationId, themeLoaded]);
  
  // Reset theme loading state when organization changes
  useEffect(() => {
    setThemeLoaded(false);
  }, [organizationId]);
  
  return (
    <>
      <SidebarProvider>
        <Toaster position={useIsMobile() ? "top-center" : "top-right"} />
        {subscriptionValidatorModal} {/* Render the modal here */}
        <Routes>
          <Route path="/" element={<LoginForm />} />
          
          {/* Super Admin Routes */}
          <Route path="/admin" element={<SuperAdminLogin />} />
          <Route element={<SuperAdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
          </Route>

          {/* User Booking Routes */}
          <Route path="/user" element={<UserLayout />}>
            <Route index element={<UserBookingForm />} />
            <Route path=":businessId" element={<UserBookingForm />} />
          </Route>
          
          {/* Subscription Plans Route */}
     
          {/* Protected Routes with Subscription Validation */}
          <Route element={<ProtectedRoute />}>
            <Route element={<>
              <SubscriptionValidator />
              <Sidebar />
            </>}>
              <Route path="/home" element={<Home />} />
              <Route path="/bookings/:id" element={<BookingDetails />} />
              <Route path="/all-bookings" element={<AllBookingsPage />} />
              <Route path="/all-booking-details/:id" element={<AllBookingDetails />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/manage-time-slots" element={<ManageTimeSlotsPage />} />
            </Route>
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SidebarProvider>
    </>
  );
}

export default App;
// src/components/User/UserLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, Link, useParams } from "react-router-dom";
import { supabase } from "../../supabase";

const UserLayout = () => {
  const [shopName, setShopName] = useState("");
  const [shopImage, setShopImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get organization ID from URL parameters
  const { businessId } = useParams();

  useEffect(() => {
    // Use organization ID from URL if available, otherwise fall back to localStorage
    const organizationId = businessId || JSON.parse(localStorage.getItem("userSession"))?.organization_id;
    
    if (!organizationId) {
      setError("No organization ID found");
      setLoading(false);
      return;
    }

    const fetchShopPreferences = async () => {
      try {
        setLoading(true);
        console.log("Fetching shop preferences for organization ID:", organizationId);
        
        const { data, error } = await supabase
          .from("shop_preferences")
          .select("shop_name, image_url")
          .eq("organization_id", organizationId);

        if (error) {
          console.error("Error fetching shop preferences:", error);
          setError("Failed to load shop preferences");
          return;
        }

        console.log("Shop preferences query result:", data);

        if (data && data.length > 0) {
          // Shop preferences found
          console.log("Shop preferences found:", data[0]);
          setShopName(data[0].shop_name || "");
          setShopImage(data[0].image_url || "");
        } else {
          // No shop preferences found, set default values
          console.log("No shop preferences found for organization:", organizationId);
          console.log("Available organization IDs in shop_preferences:");
          
          // Debug: Check what organization IDs exist in the table
          const { data: allPrefs } = await supabase
            .from("shop_preferences")
            .select("organization_id, shop_name");
          console.log("All shop preferences:", allPrefs);
          
          setShopName("");
          setShopImage("");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchShopPreferences();

    // Subscribe to changes in shop_preferences
    const channel = supabase
      .channel('shop_preferences_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'shop_preferences',
          filter: `organization_id=eq.${organizationId}`
        }, 
        (payload) => {
          if (payload.new) {
            if (payload.new.shop_name) setShopName(payload.new.shop_name);
            if (payload.new.image_url) setShopImage(payload.new.image_url);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [businessId]); // Re-run when businessId changes

  if (loading) {
    return (
      <div className="w-full bg-white">
        <header className="w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center items-center">
            <div className="flex items-center space-x-3">
              <div className="h-6 sm:h-8 md:h-10 w-6 sm:w-8 md:w-10 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </header>
        <main className="flex-1 py-6 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-full flex justify-center">
              <div className="w-full max-w-2xl">
                <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white">
        <header className="w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center items-center">
            <div className="text-red-600">Error: {error}</div>
          </div>
        </header>
        <main className="flex-1 py-6 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-full flex justify-center">
              <div className="w-full max-w-2xl">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      {/* Header */}
      <header className="w-full bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto pt-2 mb-4">
          <Link 
            to={businessId ? `/user/${businessId}` : "/user"} 
            className="flex flex-col items-center group transition-all duration-200 hover:scale-105"
          >
            {shopImage ? (
              <div className="relative">
                <img 
                  src={shopImage} 
                  alt={shopName || "Shop"} 
                  className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-cover rounded-full border-4 border-whit duration-200" 
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/10 to-transparent"></div>
              </div>
            ) : (
              <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-lg border-4 border-white flex items-center justify-center group-hover:shadow-xl transition-shadow duration-200">
                <svg 
                  className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                  />
                </svg>
              </div>
            )}
            
            <div className="text-center ">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 group-hover:text-gray-700 transition-colors duration-200">
                {shopName || ""}
              </h1>
           
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-2xl">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserLayout;
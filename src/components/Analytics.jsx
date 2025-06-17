import React, { useState, useEffect } from "react";
import CalendarDatePickerAnalytics from "@/components/ui/CalendarDatePickerAnal.jsx";
import {
  startOfYear,
  endOfYear,
} from "date-fns";
import SummaryCards from "./Analytics/SummaryCards";
import CustomerAnalytics from "./Analytics/CustomerAnalytics";
import BookingAnalytics from "./Analytics/BookingAnalytics";
import ServiceAnalytics from "./Analytics/ServiceAnalytics";
import ShopAnalytics from "./Analytics/ShopAnalytics";
import FinancialAnalytics from "./Analytics/FinancialAnalytics";
import { supabase } from "../supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

// Helper function to get start of day in local timezone
function startOfDayLocal(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to get end of day in local timezone
function endOfDayLocal(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function Analytics() {
  // Define date range state with default values - using local timezone
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    from: startOfDayLocal(startOfYear(today)), // First day of current year
    to: endOfDayLocal(endOfYear(today)), // Last day of current year
  });

  // Add state for shops and selected shop
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);

  // Get organization ID from localStorage and fetch shops on component mount
  useEffect(() => {
    try {
      // Get user session from localStorage
      const userSession = localStorage.getItem('userSession');
      if (userSession) {
        const parsedUserSession = JSON.parse(userSession);
        const orgId = parsedUserSession.organization_id;
        if (!orgId) {
          throw new Error('Organization ID not found in user session');
        }
        setOrganizationId(orgId);

        // Fetch shops for this organization
        const fetchShops = async () => {
          const { data, error } = await supabase
            .from('shops')
            .select('id, name')
            .eq('organization_id', orgId)
            .order('name');

          if (error) {
            throw error;
          }
          if (data) {
            setShops(data);
          }
        };

        fetchShops();
      } else {
        console.error('User session not found in localStorage');
        toast({
          title: "Error",
          description: "Unable to load user organization data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error getting organization ID:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load organization data",
        variant: "destructive",
      });
    }
    
    const fetchShops = async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name')
        .order('name');

      if (!error && data) {
        setShops(data);
      }
    };

    fetchShops();
  }, []);

  // Debug date changes - including local date strings
  useEffect(() => {
    console.log("Date range changed:", {
      from: dateRange.from.toISOString(),
      to: dateRange.to.toISOString(),
      fromLocal: dateRange.from.toString(),
      toLocal: dateRange.to.toString(),
      fromDate: dateRange.from.toLocaleDateString('en-CA'), // YYYY-MM-DD format
      toDate: dateRange.to.toLocaleDateString('en-CA')
    });
  }, [dateRange]);

  return (
    <div className="space-y-6 mb-[2rem]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4">
          <div className="flex  gap-2 items-center">
            <CalendarDatePickerAnalytics
              date={dateRange}
              onDateSelect={setDateRange}
              numberOfMonths={2}
              variant="outline"
              className="w-[250px]"
            />
          </div>
          <Select
            value={selectedShop}
            onValueChange={setSelectedShop}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Shops</SelectItem>
              {shops.map((shop) => (
                <SelectItem key={shop.id} value={shop.id}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Summary Cards Section */}
      <div className="mb-8">
    
        <SummaryCards dateRange={dateRange} selectedShop={selectedShop} organizationId={organizationId} />
      </div>
      
      {/* Analytics Components */}
      <div className="grid grid-cols-1 gap-6">
        <CustomerAnalytics dateRange={dateRange} organizationId={organizationId} />
        <BookingAnalytics dateRange={dateRange} organizationId={organizationId} />
        <ServiceAnalytics dateRange={dateRange} organizationId={organizationId} />
        {/* <DogAnalytics dateRange={dateRange} /> */}
        <ShopAnalytics dateRange={dateRange} organizationId={organizationId} />
        <FinancialAnalytics dateRange={dateRange} organizationId={organizationId} />
      </div>
    </div>
  );
}

export default Analytics;
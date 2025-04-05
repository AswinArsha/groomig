import React, { useState, useEffect } from "react";
import CalendarDatePickerAnalytics from "../components/ui/calendardatepickeranalytics.jsx";
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

  // Fetch shops on component mount
  useEffect(() => {
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
    <div className="space-y-6">
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
        <h2 className="text-xl font-semibold mb-4">Business Summary</h2>
        <SummaryCards dateRange={dateRange} selectedShop={selectedShop} />
      </div>
      
      {/* Analytics Components */}
      <div className="grid grid-cols-1 gap-6">
        <CustomerAnalytics dateRange={dateRange} />
        <BookingAnalytics dateRange={dateRange} />
        <ServiceAnalytics dateRange={dateRange} />
        {/* <DogAnalytics dateRange={dateRange} /> */}
        <ShopAnalytics dateRange={dateRange} />
        <FinancialAnalytics dateRange={dateRange} />
      </div>
    </div>
  );
}

export default Analytics;
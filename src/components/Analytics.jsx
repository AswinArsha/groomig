import React, { useState, useEffect } from "react";
import CalendarDatePickerAnalytics from "@/components/ui/calendardatepickeranalytics";
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
        <div className="flex justify-center items-center">
          <div className="flex gap-2 items-center">
            <CalendarDatePickerAnalytics
              date={dateRange}
              onDateSelect={setDateRange}
              numberOfMonths={2}
              variant="outline"
              className="w-[250px]"
            />
          </div>
        </div>
      </div>
      
      {/* Summary Cards Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Business Summary</h2>
        <SummaryCards dateRange={dateRange} />
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
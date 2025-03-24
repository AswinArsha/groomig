// src/components/Analytics.jsx
import React, { useState, useEffect } from "react";
import CalendarDatePicker from "@/components/ui/CalendarDatePickerAnalytics";
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

function Analytics() {
  // Define date range state with default values
  const [dateRange, setDateRange] = useState({
    from: startOfYear(new Date()), // First day of current year
    to: endOfYear(new Date()), // Last day of current year
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex justify-center items-center">
          <div className="flex gap-2 items-center">
            <CalendarDatePicker
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
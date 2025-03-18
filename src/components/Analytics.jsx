// src/components/Analytics.jsx
import React, { useState } from "react";
import CalendarDatePicker from "@/components/ui/CalendarDatePicker";
// Import analytics components
import CustomerAnalytics from "./Analytics/CustomerAnalytics";
import BookingAnalytics from "./Analytics/BookingAnalytics";
import ServiceAnalytics from "./Analytics/ServiceAnalytics";
import DogAnalytics from "./Analytics/DogAnalytics";
import ShopAnalytics from "./Analytics/ShopAnalytics";
import FinancialAnalytics from "./Analytics/FinancialAnalytics";

function Analytics() {
  // Define date range state with default values
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1), // First day of current year
    to: new Date(new Date().getFullYear(), 11, 31), // Last day of current year
  });

  return (
    <div className="">
      <div className="flex justify-center items-center mb-6">
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
      
      {/* Analytics Components */}
      <div className="grid grid-cols-1  gap-6">
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
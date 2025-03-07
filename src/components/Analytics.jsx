// src/components/Analytics.jsx
import React, { useState, useEffect } from "react";
import TotalRevenueOverview from "./Analytics/TotalRevenueOverview";
import RevenueBreakdown from "./Analytics/RevenueBreakdown";
import CustomerDemographics from "./Analytics/CustomerDemographics";
import ServicePopularity from "./Analytics/ServicePopularity";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Analytics() {
  // Define date range state with default values
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), // Default: 1 year ago
    to: new Date(), // Default: today
  });
  
  // Predefined date ranges
  const [selectedPreset, setSelectedPreset] = useState("year");
  
  // Set predefined date ranges
  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);
    const today = new Date();
    let fromDate;
    
    switch (preset) {
      case "month":
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - 1);
        break;
      case "quarter":
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - 3);
        break;
      case "year":
        fromDate = new Date(today);
        fromDate.setFullYear(today.getFullYear() - 1);
        break;
      case "all":
        fromDate = new Date(2010, 0, 1); // Far back enough to include all data
        break;
      default:
        fromDate = new Date(today);
        fromDate.setFullYear(today.getFullYear() - 1);
    }
    
    setDateRange({ from: fromDate, to: today });
  };
  
  // Format date for display
  const formatDateRange = () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      return "Select date range";
    }
    
    return `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        
        <div className="flex gap-2 items-center">
          {/* Predefined date ranges */}
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date range picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[250px] justify-start text-left font-normal"
                onClick={() => selectedPreset !== "custom" && setSelectedPreset("custom")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => {
                  if (range && range.from) {
                    setDateRange(range);
                    setSelectedPreset("custom");
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Total Revenue Overview */}
        <div>
          <TotalRevenueOverview dateRange={dateRange} />
        </div>
        
        {/* Revenue Breakdown */}
        <div>
          <RevenueBreakdown dateRange={dateRange} />
        </div>
        
        {/* Customer Demographics */}
        <div>
          <CustomerDemographics dateRange={dateRange} />
        </div>
        
        {/* Service Popularity */}
        <div>
          <ServicePopularity dateRange={dateRange} />
        </div>
      </div>
    </div>
  );
}

export default Analytics;
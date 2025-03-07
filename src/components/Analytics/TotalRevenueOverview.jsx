// src/components/analytics/TotalRevenueOverview.jsx
import React, { useState, useEffect } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { supabase } from "../../supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

const TotalRevenueOverview = ({ dateRange }) => {
  const [revenueData, setRevenueData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [yearOnYearGrowth, setYearOnYearGrowth] = useState(0);
  const [forecastData, setForecastData] = useState([]);
  
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchRevenueData();
    }
  }, [dateRange]);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      // Get bookings with completed status
      let query = supabase
        .from("historical_bookings")
        .select("*")
        .eq("status", "completed")
        .order("booking_date", { ascending: false });
      
      // Apply date range filter
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        query = query.gte("booking_date", fromDate.toISOString().split('T')[0]);
      }
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        query = query.lte("booking_date", toDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data to extract revenue
      const processedData = processRevenueData(data);
      setRevenueData(processedData);
      
      // Calculate year-on-year growth
      calculateYearOnYearGrowth(processedData);
      
      // Generate forecast data
      const forecast = generateForecast(processedData);
      setForecastData(forecast);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processRevenueData = (data) => {
    if (!data || data.length === 0) {
      return [];
    }
    
    // Determine grouping interval based on date range length
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    const daysDiff = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    
    let formatStr = "MMM yyyy"; // Default monthly
    if (daysDiff <= 31) {
      formatStr = "dd MMM"; // Daily for ranges up to a month
    } else if (daysDiff <= 90) {
      formatStr = "'Week' w, yyyy"; // Weekly for ranges up to 3 months
    }
    
    // Group data by time period (month/week/day)
    const groupedData = data.reduce((acc, booking) => {
      try {
        // Extract date
        const bookingDate = new Date(booking.booking_date);
        if (!isValid(bookingDate)) return acc;
        
        const period = format(bookingDate, formatStr);
        
        // Calculate revenue from services
        let revenue = 0;
        if (booking.services) {
          try {
            const services = typeof booking.services === 'string' 
              ? JSON.parse(booking.services) 
              : booking.services;
              
            revenue = services.reduce((sum, service) => sum + (Number(service.price) || 0), 0);
          } catch (e) {
            console.error("Error parsing services JSON:", e);
          }
        }
        
        if (!acc[period]) {
          acc[period] = { currentYear: 0, previousYear: 0 };
        }
        
        // Determine if this is current or previous year
        const currentYear = new Date().getFullYear();
        if (bookingDate.getFullYear() === currentYear) {
          acc[period].currentYear += revenue;
        } else if (bookingDate.getFullYear() === currentYear - 1) {
          acc[period].previousYear += revenue;
        }
      } catch (error) {
        console.error("Error processing booking:", error, booking);
      }
      return acc;
    }, {});
    
    // Convert to array format for chart
    return Object.entries(groupedData).map(([period, values]) => ({
      period,
      currentYear: values.currentYear,
      previousYear: values.previousYear
    })).sort((a, b) => {
      // Sort by period
      if (formatStr === "dd MMM") {
        // Special handling for day format since it doesn't include year
        return new Date(a.period + " 2023") - new Date(b.period + " 2023");
      }
      return new Date(a.period) - new Date(b.period);
    }).slice(-12); // Get last 12 periods
  };
  
  const calculateYearOnYearGrowth = (data) => {
    // Calculate total revenue for current and previous year
    const totals = data.reduce((acc, item) => {
      acc.currentYear += item.currentYear;
      acc.previousYear += item.previousYear;
      return acc;
    }, { currentYear: 0, previousYear: 0 });
    
    // Calculate percentage growth
    if (totals.previousYear > 0) {
      const growth = ((totals.currentYear - totals.previousYear) / totals.previousYear) * 100;
      setYearOnYearGrowth(growth);
    } else {
      setYearOnYearGrowth(0);
    }
  };
  
  const generateForecast = (data) => {
    if (!data || data.length < 3) return [];
    
    try {
      // Simple linear regression for forecasting
      const recentMonths = data.slice(-3);
      
      // Check if we have valid data
      const validData = recentMonths.every(item => 
        typeof item.currentYear === 'number' && !isNaN(item.currentYear) && item.currentYear > 0
      );
      
      if (!validData) return [];
      
      // Calculate average growth rate
      let avgGrowth = 0;
      let validComparisons = 0;
      
      for (let i = 1; i < recentMonths.length; i++) {
        const prevValue = recentMonths[i-1].currentYear;
        const currentValue = recentMonths[i].currentYear;
        
        if (prevValue > 0) {
          avgGrowth += (currentValue - prevValue) / prevValue;
          validComparisons++;
        }
      }
      
      avgGrowth = validComparisons > 0 ? avgGrowth / validComparisons : 0.05; // Default to 5% if no valid data
      
      // Limit extreme growth predictions
      avgGrowth = Math.min(Math.max(avgGrowth, -0.2), 0.3); // Limit between -20% and +30%
      
      const lastValue = recentMonths[recentMonths.length - 1];
      const forecastPeriods = [];
      
      // Generate 3 forecast periods based on the interval type
      const periodFormat = lastValue.period.includes('Week') ? 'weekly' : 
                          lastValue.period.includes(' 20') ? 'monthly' : 'daily';
      
      // Generate forecast periods
      for (let i = 1; i <= 3; i++) {
        let nextPeriod;
        
        if (periodFormat === 'weekly') {
          const weekMatch = lastValue.period.match(/Week (\d+), (\d+)/);
          if (weekMatch) {
            const weekNum = parseInt(weekMatch[1]);
            const year = parseInt(weekMatch[2]);
            const newWeek = weekNum + i > 52 ? (weekNum + i) % 52 : weekNum + i;
            const newYear = weekNum + i > 52 ? year + 1 : year;
            nextPeriod = `Week ${newWeek}, ${newYear}`;
          }
        } else if (periodFormat === 'monthly') {
          const lastDate = new Date(lastValue.period);
          const forecastDate = new Date(lastDate);
          forecastDate.setMonth(forecastDate.getMonth() + i);
          nextPeriod = format(forecastDate, "MMM yyyy");
        } else {
          // Assuming format like "15 Jan" for daily
          const lastDate = new Date(lastValue.period + " 2023"); // Adding arbitrary year
          const forecastDate = new Date(lastDate);
          forecastDate.setDate(forecastDate.getDate() + i);
          nextPeriod = format(forecastDate, "dd MMM");
        }
        
        if (nextPeriod) {
          const forecastValue = lastValue.currentYear * Math.pow(1 + avgGrowth, i);
          forecastPeriods.push({
            period: nextPeriod,
            forecast: Math.round(forecastValue),
          });
        }
      }
      
      return forecastPeriods;
    } catch (error) {
      console.error("Error generating forecast:", error);
      return [];
    }
  };
  
  const chartData = revenueData;
  const forecastChartData = forecastData;
  
  // Combine historical and forecast data for the main chart
  const combinedData = chartData.length > 0 ? [
    ...chartData,
    ...forecastChartData
  ] : [];
  
  const chartConfig = {
    currentYear: {
      label: "Current Year",
      color: "hsl(var(--chart-1))"
    },
    previousYear: {
      label: "Previous Year",
      color: "hsl(var(--chart-2))"
    },
    forecast: {
      label: "Forecast",
      color: "hsl(var(--chart-3))"
    }
  };

  // Calculate total revenue for current year
  const totalCurrentYearRevenue = chartData.reduce(
    (sum, item) => sum + item.currentYear, 0
  );

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  // Determine what time interval we're showing
  const getTimeIntervalLabel = () => {
    if (!dateRange.from || !dateRange.to) return "";
    
    const daysDiff = Math.ceil(
      (new Date(dateRange.to) - new Date(dateRange.from)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysDiff <= 31) {
      return "daily";
    } else if (daysDiff <= 90) {
      return "weekly";
    } else {
      return "monthly";
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Total Revenue Overview</CardTitle>
            <CardDescription>Track your revenue trends over time</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="mb-4 flex justify-between items-center">
            <div>
              <p className="text-lg text-muted-foreground">Total Revenue (Current)</p>
              <h3 className="text-3xl font-bold">{formatCurrency(totalCurrentYearRevenue)}</h3>
            </div>
            {yearOnYearGrowth !== 0 && (
              <div className={`flex items-center gap-2 text-sm px-2 py-1 rounded-md ${
                yearOnYearGrowth >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}>
                <TrendingUp className="h-4 w-4" />
                <span>{yearOnYearGrowth.toFixed(1)}% vs last year</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 flex justify-center items-center">
            <p className="text-muted-foreground">No revenue data available for the selected date range.</p>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No data available</p>
              <p className="text-sm text-muted-foreground">Complete some bookings to see revenue analytics</p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64">
            <LineChart
              accessibilityLayer
              data={combinedData}
              margin={{
                top: 20,
                right: 30,
                left: 30,
                bottom: 5,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis 
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis 
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip 
                cursor={false}
                content={
                  <ChartTooltipContent 
                    formatter={(value) => formatCurrency(value)}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="previousYear"
                stroke="var(--color-previousYear)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--color-previousYear)" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="currentYear"
                stroke="var(--color-currentYear)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--color-currentYear)" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="var(--color-forecast)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: "var(--color-forecast)" }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {chartData.length > 0 ? (
          <>
            <div className="flex gap-2 font-medium leading-none">
              {yearOnYearGrowth > 0 ? (
                <>Trending up by {yearOnYearGrowth.toFixed(1)}% compared to last year <TrendingUp className="h-4 w-4" /></>
              ) : yearOnYearGrowth < 0 ? (
                <>Trending down by {Math.abs(yearOnYearGrowth).toFixed(1)}% compared to last year</>
              ) : (
                <>No change compared to last year</>
              )}
            </div>
            <div className="leading-none text-muted-foreground">
              Showing {getTimeIntervalLabel()} revenue with 3-period forecast
            </div>
          </>
        ) : (
          <div className="leading-none text-muted-foreground">
            Try selecting a different date range or check back after completing some bookings
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default TotalRevenueOverview;
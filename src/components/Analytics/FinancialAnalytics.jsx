// src/components/Analytics/FinancialAnalytics.jsx
import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from "lucide-react";
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

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
  ChartTooltipContent
} from "@/components/ui/chart";

import { supabase } from "../../supabase"; // Adjust path as needed

function FinancialAnalytics({ dateRange, organizationId }) {
  const [revenueData, setRevenueData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueTrend, setRevenueTrend] = useState(0);
  const [highestRevenueMonth, setHighestRevenueMonth] = useState({ month: '', revenue: 0 });
  const [averageMonthlyRevenue, setAverageMonthlyRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Chart configuration
  const revenueConfig = {
    revenue: {
      label: "Monthly Revenue",
      color: "hsl(var(--chart-2))",
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, [dateRange, organizationId]);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      // Get organization_id from user session if not provided as prop
      let orgId = organizationId;
      if (!orgId) {
        const storedSession = localStorage.getItem('userSession');
        if (!storedSession) {
          throw new Error('User session not found');
        }
        const { organization_id } = JSON.parse(storedSession);
        if (!organization_id) {
          throw new Error('Organization information not found');
        }
        orgId = organization_id;
      }

      // Convert dates to IST by adding 5 hours and 30 minutes
      const getISTDate = (date) => {
        const d = new Date(date);
        return new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
      };

      const from = dateRange?.from ? getISTDate(dateRange.from).toISOString().split('T')[0] : '2010-01-01';
      const to = dateRange?.to ? getISTDate(dateRange.to).toISOString().split('T')[0] : getISTDate(new Date()).toISOString().split('T')[0];
      
      // Fetch bookings with date and services data, enforcing organization filter
      const { data, error } = await supabase
        .from('historical_bookings')
        .select('booking_date, services')
        .eq('organization_id', orgId)
        .gte('booking_date', from)
        .lte('booking_date', to)
        .not('services', 'is', null);
        
      if (error) throw error;
      
      // Process revenue data by month
      const monthlyRevenue = {};
      let totalRev = 0;
      
      data.forEach(booking => {
        if (!booking.booking_date) return;
        
        // Convert booking date to IST
        const bookingDate = new Date(new Date(booking.booking_date).getTime() + (5.5 * 60 * 60 * 1000));
        const monthYear = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyRevenue[monthYear]) {
          monthlyRevenue[monthYear] = 0;
        }
        
        // Calculate revenue from services
        if (booking.services && Array.isArray(booking.services)) {
          booking.services.forEach(service => {
            if (service && service.price) {
              const price = parseFloat(service.price) || 0;
              monthlyRevenue[monthYear] += price;
              totalRev += price;
            }
          });
        }
      });
      
      // Convert to array for chart
      const monthLabels = {
        '01': 'January',
        '02': 'February',
        '03': 'March',
        '04': 'April',
        '05': 'May',
        '06': 'June',
        '07': 'July',
        '08': 'August',
        '09': 'September',
        '10': 'October',
        '11': 'November',
        '12': 'December'
      };
      
      const chartData = Object.keys(monthlyRevenue).map(monthYear => {
        const [year, month] = monthYear.split('-');
        const monthName = monthLabels[month];
        
        return {
          month: `${monthName} ${year}`,
          revenue: monthlyRevenue[monthYear],
          shortMonth: monthName.slice(0, 3)
        };
      });
      
      // Sort chronologically
      chartData.sort((a, b) => {
        return new Date(a.month) - new Date(b.month);
      });
      
      setRevenueData(chartData);
      setTotalRevenue(totalRev);
      
      // Calculate trend if we have at least 2 months of data
      if (chartData.length >= 2) {
        // Use last 3 months for trend if available, otherwise use all data
        const trendPeriod = Math.min(3, chartData.length);
        const recentMonths = chartData.slice(-trendPeriod);
        
        if (trendPeriod >= 2) {
          const firstMonth = recentMonths[0].revenue;
          const lastMonth = recentMonths[recentMonths.length - 1].revenue;
          
          if (firstMonth > 0) {
            const trendPercent = ((lastMonth - firstMonth) / firstMonth) * 100;
            setRevenueTrend(trendPercent.toFixed(1));
          }
        }
      }
      
      // Find highest revenue month
      if (chartData.length > 0) {
        const highest = chartData.reduce((max, item) => 
          max.revenue > item.revenue ? max : item
        , { revenue: 0 });
        
        setHighestRevenueMonth({
          month: highest.month,
          revenue: highest.revenue
        });
      }
      
      // Calculate average monthly revenue
      if (chartData.length > 0) {
        const avg = totalRev / chartData.length;
        setAverageMonthlyRevenue(avg);
      }
      
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const getDateRangeText = () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      return 'All time';
    }
    
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    
    const fromStr = from.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const toStr = to.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    
    return `${fromStr} - ${toStr}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Financial Analytics</h2>
        <div className="p-8 text-center">Loading financial data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold hidden sm:block">Financial Analytics</h2>

      
      <div className="space-y-4">
 
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <IndianRupee className="h-5 w-5" />
                  Total Revenue <span className="hidden sm:block">Over Time</span> 
                </CardTitle>
                <CardDescription className="hidden sm:block">Monthly revenue trend</CardDescription>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            </div>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ChartContainer config={revenueConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    accessibilityLayer
                    data={revenueData}
                    margin={{
                      left: 40,
                      right: 40,
                      top: 20,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="shortMonth"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickFormatter={(value) => `₹${value.toLocaleString('en-IN', { notation: 'compact', compactDisplay: 'short' })}`}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                    />
                    <ChartTooltip
                      content={(props) => {
                        const { active, payload } = props;
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card p-3 border shadow-lg rounded-lg">
                              <p className="font-semibold text-card-foreground mb-1">{data.month}</p>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <IndianRupee className="h-4 w-4" />
                                <span className="font-medium text-card-foreground">
                                  {data.revenue.toLocaleString('en-IN')}
                                </span>
                              </div>
                              {revenueData && revenueData.length > 1 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {Math.round((data.revenue / totalRevenue) * 100)}% of total revenue
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.4}
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No revenue data available for the selected period
              </div>
            )}
          </CardContent>
          <CardFooter>
            <div className="w-full space-y-4">
            
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="flex items-center p-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                </div>
                <CardContent className="p-0">
                  <p className="text-sm text-muted-foreground">Highest Revenue</p>
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    <p className="font-medium">{highestRevenueMonth.revenue.toLocaleString('en-IN')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{highestRevenueMonth.month}</p>
                </CardContent>
              </Card>
              
              <Card className="flex items-center p-3">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                  <IndianRupee className="h-4 w-4 text-amber-600" />
                </div>
                <CardContent className="p-0">
                  <p className="text-sm text-muted-foreground">Avg. Monthly Revenue</p>
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    <p className="font-medium">{averageMonthlyRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {revenueData.length} {revenueData.length === 1 ? 'month' : 'months'} in selected period
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
    </div>
  );
}

export default FinancialAnalytics;
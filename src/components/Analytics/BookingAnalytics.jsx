// src/components/Analytics/BookingAnalytics.jsx
import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown,
  CalendarClock, 
  CheckCircle, 
  XCircle 
} from "lucide-react";
import { 
  Line, 
  LineChart, 
  Area,
  AreaChart,
  Pie, 
  PieChart, 
  CartesianGrid, 
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer
} from "recharts";


import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {

  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "../../supabase"; // Adjust path as needed

function BookingAnalytics({ dateRange }) {
  const [totalBookingsData, setTotalBookingsData] = useState([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [bookingTrend, setBookingTrend] = useState(0);
  
  const [completionRateData, setCompletionRateData] = useState([]);
  const [completionRate, setCompletionRate] = useState(0);
  
  const [cancellationRateData, setCancellationRateData] = useState([]);
  const [cancellationRate, setCancellationRate] = useState(0);
  const [cancellationTrend, setCancellationTrend] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);

  // Chart configurations
  const totalBookingsConfig = {
    bookings: {
      label: "Total Bookings",
      color: "hsl(var(--chart-6))",
    }
  };

  const completionRateConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-7))",
    },
    cancelled: {
      label: "Cancelled",
      color: "hsl(var(--chart-8))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--chart-4))",
    }
  };

  const cancellationRateConfig = {
    rate: {
      label: "Cancellation Rate (%)",
      color: "hsl(var(--chart-8))",
    }
  };

  useEffect(() => {
    fetchBookingData();
  }, [dateRange]);

  const fetchBookingData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchTotalBookingsData(),
        fetchCompletionRateData(),
        fetchCancellationRateData()
      ]);
    } catch (error) {
      console.error("Error fetching booking analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert date to IST string
const getISTDateString = (date) => {
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return istDate.toISOString().split('T')[0];
};

const fetchTotalBookingsData = async () => {
    const from = dateRange?.from ? getISTDateString(dateRange.from) : '2010-01-01';
    const to = dateRange?.to ? getISTDateString(dateRange.to) : getISTDateString(new Date());
    
    try {
      // Fetch bookings within date range
      const { data, error } = await supabase
        .from('historical_bookings')
        .select('booking_date')
        .gte('booking_date', from)
        .lte('booking_date', to)
        .order('booking_date');
        
      if (error) throw error;
      
      // Set total booking count
      setBookingCount(data.length);
      
      // Group bookings by month
      const bookingsByMonth = {};
      
      data.forEach(booking => {
        const bookingDate = new Date(booking.booking_date);
        const monthYear = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!bookingsByMonth[monthYear]) {
          bookingsByMonth[monthYear] = 0;
        }
        
        bookingsByMonth[monthYear]++;
      });
      
      // Convert to array for chart
      const chartData = Object.keys(bookingsByMonth).map(month => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' });
        
        return {
          month: monthName,
          bookings: bookingsByMonth[month]
        };
      });
      
      // Sort chronologically
      chartData.sort((a, b) => {
        const monthA = new Date(Date.parse(`1 ${a.month} 2000`)).getMonth();
        const monthB = new Date(Date.parse(`1 ${b.month} 2000`)).getMonth();
        return monthA - monthB;
      });
      
      setTotalBookingsData(chartData);
      
      // Calculate trend if we have at least 2 months of data
      if (chartData.length >= 2) {
        const firstMonth = chartData[0].bookings;
        const lastMonth = chartData[chartData.length - 1].bookings;
        
        if (firstMonth > 0) {
          const trendPercent = ((lastMonth - firstMonth) / firstMonth) * 100;
          setBookingTrend(trendPercent.toFixed(1));
        }
      }
      
    } catch (error) {
      console.error('Error fetching total bookings data:', error);
    }
  };

  const fetchCompletionRateData = async () => {
    const from = dateRange?.from ? getISTDateString(dateRange.from) : '2010-01-01';
    const to = dateRange?.to ? getISTDateString(dateRange.to) : getISTDateString(new Date());
    
    try {
      // Fetch bookings with status
      const { data, error } = await supabase
        .from('historical_bookings')
        .select('status')
        .gte('booking_date', from)
        .lte('booking_date', to);
        
      if (error) throw error;
      
      // Count status types
      const statusCounts = {
        completed: 0,
        cancelled: 0,
        pending: 0
      };
      
      data.forEach(booking => {
        if (booking.status === 'completed') {
          statusCounts.completed++;
        } else if (booking.status === 'cancelled') {
          statusCounts.cancelled++;
        } else {
          statusCounts.pending++;
        }
      });
      
      // Prepare chart data
      const chartData = [
        { name: 'Completed', value: statusCounts.completed, fill: 'var(--color-completed)' },
        { name: 'Cancelled', value: statusCounts.cancelled, fill: 'var(--color-cancelled)' },
        { name: 'Pending', value: statusCounts.pending, fill: 'var(--color-pending)' }
      ];
      
      setCompletionRateData(chartData);
      
      // Calculate completion rate percentage
      const total = statusCounts.completed + statusCounts.cancelled + statusCounts.pending;
      if (total > 0) {
        const rate = Math.round((statusCounts.completed / total) * 100);
        setCompletionRate(rate);
      }
      
      // Also set cancellation rate for the summary
      if (total > 0) {
        setCancellationRate(Math.round((statusCounts.cancelled / total) * 100));
      }
      
    } catch (error) {
      console.error('Error fetching completion rate data:', error);
    }
  };

  const fetchCancellationRateData = async () => {
    const from = dateRange?.from ? getISTDateString(dateRange.from) : '2010-01-01';
    const to = dateRange?.to ? getISTDateString(dateRange.to) : getISTDateString(new Date());
    
    try {
      // Fetch bookings with status and date
      const { data, error } = await supabase
        .from('historical_bookings')
        .select('booking_date, status')
        .gte('booking_date', from)
        .lte('booking_date', to)
        .order('booking_date');
        
      if (error) throw error;
      
      // Group by month and calculate cancellation rate
      const monthlyData = {};
      
      data.forEach(booking => {
        const bookingDate = new Date(booking.booking_date);
        const monthYear = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            total: 0,
            cancelled: 0
          };
        }
        
        monthlyData[monthYear].total++;
        
        if (booking.status === 'cancelled') {
          monthlyData[monthYear].cancelled++;
        }
      });
      
      // Calculate cancellation rate for each month
      const chartData = Object.keys(monthlyData).map(month => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' });
        
        const total = monthlyData[month].total;
        const cancelled = monthlyData[month].cancelled;
        const rate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
        
        return {
          month: monthName,
          rate: rate,
          cancelled: cancelled,
          total: total
        };
      });
      
      // Sort chronologically
      chartData.sort((a, b) => {
        const monthA = new Date(Date.parse(`1 ${a.month} 2000`)).getMonth();
        const monthB = new Date(Date.parse(`1 ${b.month} 2000`)).getMonth();
        return monthA - monthB;
      });
      
      setCancellationRateData(chartData);
      
      // Calculate trend if we have at least 2 months of data
      if (chartData.length >= 2) {
        const firstMonth = chartData[0].rate;
        const lastMonth = chartData[chartData.length - 1].rate;
        
        const trendDiff = lastMonth - firstMonth;
        setCancellationTrend(trendDiff);
      }
      
    } catch (error) {
      console.error('Error fetching cancellation rate data:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Booking Analytics</h2>
        <div className="p-8 text-center">Loading booking analytics data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Booking Analytics</h2>
      
      <div className="space-y-4">
  
        <Tabs defaultValue="total">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="total">Total Bookings</TabsTrigger>
     
            <TabsTrigger value="cancellation">Cancellation Rate</TabsTrigger>
          </TabsList>
          
          {/* Total Bookings Tab */}
          <TabsContent value="total">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <CalendarClock className="h-5 w-5" />
                      Total Bookings
                    </CardTitle>
                    <CardDescription className="hidden sm:block">Monthly booking volume</CardDescription>
                  </div>
                  <div className="text-2xl font-bold">{bookingCount}</div>
                </div>
              </CardHeader>
              <CardContent>
                {totalBookingsData.length > 0 ? (
                  <ChartContainer config={totalBookingsConfig} className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        accessibilityLayer
                        data={totalBookingsData}
                        margin={{
                          left: 40,
                          right: 40,
                          top: 20,
                          bottom: 20,
                        }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tickMargin={10}
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
                                    <CalendarClock className="h-4 w-4" />
                                    <span className="font-medium text-card-foreground">
                                      {data.bookings} bookings
                                    </span>
                                  </div>
                                  {totalBookingsData.length > 1 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {bookingCount > 0 ? Math.round((data.bookings / bookingCount) * 100) : 0}% of total bookings
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
                          dataKey="bookings"
                          stroke="hsl(var(--chart-6))"
                          fill="hsl(var(--chart-6))"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No booking data available for the selected period
                  </div>
                )}
              </CardContent>
           
            </Card>
          </TabsContent>
          

          
          {/* Cancellation Rate Tab */}
          <TabsContent value="cancellation">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                      <XCircle className="h-5 w-5" />
                      Cancellation Rate
                    </CardTitle>
                    <CardDescription className="hidden sm:block">Monthly booking cancellations</CardDescription>
                  </div>
                  <div className="text-2xl font-bold">{cancellationRate}%</div>
                </div>
              </CardHeader>
              <CardContent>
                {cancellationRateData.length > 0 ? (
                  <ChartContainer config={cancellationRateConfig} className="h-[350px] w-full">
                    <AreaChart
                      accessibilityLayer
                      data={cancellationRateData}
                      margin={{
                        left: 40,
                        right: 40,
                        top: 20,
                        bottom: 20,
                      }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 3)}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        domain={[0, 100]}
                      />
                      <ChartTooltip
                        content={(props) => {
                          const { active, payload } = props;
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card p-3 border shadow-lg rounded-lg">
                                <p className="font-semibold text-card-foreground mb-1">{data.month}</p>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <XCircle className="h-4 w-4" />
                                    <span className="font-medium text-card-foreground">
                                    {data.cancelled} out of {data.total} bookings cancelled
                                     
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                  {data.rate}% cancellation rate
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="rate"
                        stroke="hsl(var(--chart-8))"
                        fill="hsl(var(--chart-8))"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No cancellation data available for the selected period
                  </div>
                )}
              </CardContent>
           
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default BookingAnalytics;
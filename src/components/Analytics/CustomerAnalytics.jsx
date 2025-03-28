import React, { useState, useEffect } from "react";
import { TrendingUp, Users, Repeat, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { parse, startOfMonth, endOfMonth } from "date-fns";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Line, 
  LineChart, 
  Pie, 
  PieChart, 
  XAxis,
  ResponsiveContainer,
  YAxis,
  Tooltip,
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
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "../../supabase"; // Adjust the path based on your project structure

function CustomerAnalytics({ dateRange }) {
  const navigate = useNavigate();
  const [uniqueCustomersData, setUniqueCustomersData] = useState([]);
  const [totalUniqueCustomers, setTotalUniqueCustomers] = useState(0);
  const [customerGrowth, setCustomerGrowth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [satisfactionData, setSatisfactionData] = useState([]);
  const [totalRatings, setTotalRatings] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingChange, setRatingChange] = useState(0);

  // Chart configurations with proper colors
  const uniqueCustomersConfig = {
    customers: {
      label: "Customers",
      color: "hsl(var(--chart-1))",
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      await fetchUniqueCustomersData();
      await fetchSatisfactionData();
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUniqueCustomersData = async () => {
    try {
      // Use local date strings (IST) for querying
      // Convert dates to India local date strings (YYYY-MM-DD format)
      const from = dateRange?.from ? dateRange.from.toLocaleDateString('en-CA') : '2010-01-01';
      const to = dateRange?.to ? dateRange.to.toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA');
      
      console.log("Fetching customer analytics with date range:", { from, to });

      // Fetch total unique customers
      let query = supabase
        .from('historical_bookings')
        .select('contact_number, booking_date')
        
      // Use exact match for single day queries
      if (from === to) {
        query = query.eq('booking_date', from);
      } else {
        query = query.gte('booking_date', from).lte('booking_date', to);
      }
      
      const { data: uniqueCustomersCount, error: countError } = await query.order('contact_number');

      if (countError) throw countError;

      // Get unique customers
      const uniqueCustomers = [...new Set(uniqueCustomersCount.map(booking => booking.contact_number))];
      setTotalUniqueCustomers(uniqueCustomers.length);

      // Fetch monthly data for the chart including cancellation status
      let bookingsQuery = supabase
        .from('historical_bookings')
        .select('booking_date, contact_number, status');
        
      // Use exact match for single day queries  
      if (from === to) {
        bookingsQuery = bookingsQuery.eq('booking_date', from);
      } else {
        bookingsQuery = bookingsQuery.gte('booking_date', from).lte('booking_date', to);
      }
      
      const { data: bookingsData, error: bookingsError } = await bookingsQuery.order('booking_date');

      if (bookingsError) throw bookingsError;

      // Group by month and count total and unique customers
      const monthlyData = {};
      const customerHistory = new Set(); // Track all customers we've seen
      
      // Sort bookings by date to process them chronologically
      const sortedBookings = bookingsData.sort((a, b) => 
        new Date(a.booking_date) - new Date(b.booking_date)
      );
      
      sortedBookings.forEach(booking => {
        // Parse the date in local timezone
        const bookingDate = new Date(booking.booking_date);
        const monthYear = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            total: 0,
            unique: new Set(),
            returning: new Set(),
            cancelled: 0
          };
        }
        
        monthlyData[monthYear].total++;
        monthlyData[monthYear].unique.add(booking.contact_number);
        
        // Track cancelled bookings
        if (booking.status === 'cancelled') {
          monthlyData[monthYear].cancelled++;
        }
        
        // Check if this customer has been seen before
        if (customerHistory.has(booking.contact_number)) {
          monthlyData[monthYear].returning.add(booking.contact_number);
        }
        
        // Add customer to history after processing
        customerHistory.add(booking.contact_number);
      });

      // Convert to array for the chart
      const chartData = Object.keys(monthlyData).map(month => {
        const [year, monthNum] = month.split('-');
        const monthName = new Date(year, parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' });
        
        // Calculate percentage change from previous month
        const prevMonth = new Date(year, parseInt(monthNum) - 2);
        const prevMonthKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
        const prevTotal = monthlyData[prevMonthKey]?.total || 0;
        const percentageChange = prevTotal ? ((monthlyData[month].total - prevTotal) / prevTotal * 100).toFixed(1) : 0;
        
        return {
          month: monthName,
          customers: monthlyData[month].total,
          uniqueCustomers: monthlyData[month].unique.size,
          returningCustomers: monthlyData[month].returning.size,
          newCustomers: monthlyData[month].unique.size - monthlyData[month].returning.size,
          cancelledBookings: monthlyData[month].cancelled,
          percentageChange: percentageChange
        };
      });

      // Sort by date
      chartData.sort((a, b) => {
        const monthA = new Date(Date.parse(`1 ${a.month} 2000`)).getMonth();
        const monthB = new Date(Date.parse(`1 ${b.month} 2000`)).getMonth();
        return monthA - monthB;
      });

      setUniqueCustomersData(chartData);

      // Calculate growth rate if we have data for multiple months
      if (chartData.length >= 2) {
        const firstMonth = chartData[0].customers;
        const lastMonth = chartData[chartData.length - 1].customers;
        
        if (firstMonth > 0) {
          const growthRate = ((lastMonth - firstMonth) / firstMonth) * 100;
          setCustomerGrowth(growthRate.toFixed(1));
        }
      }
    } catch (error) {
      console.error('Error fetching unique customers data:', error);
    }
  };

  const fetchSatisfactionData = async () => {
    try {
      // Use local date strings (IST) for querying
      const from = dateRange?.from ? dateRange.from.toLocaleDateString('en-CA') : '2010-01-01';
      const to = dateRange?.to ? dateRange.to.toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA');
      
      let query = supabase
        .from('historical_bookings')
        .select('feedback')
        .not('feedback', 'is', null);
        
      // Use exact match for single day queries
      if (from === to) {
        query = query.eq('booking_date', from);
      } else {
        query = query.gte('booking_date', from).lte('booking_date', to);
      }
        
      const { data, error } = await query;
        
      if (error) throw error;
      
      // Count ratings
      const ratingsCount = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0
      };
      
      let totalRating = 0;
      let validRatings = 0;
      
      data.forEach(booking => {
        if (booking.feedback && booking.feedback.rating) {
          const rating = parseInt(booking.feedback.rating);
          if (rating >= 1 && rating <= 5) {
            ratingsCount[rating.toString()]++;
            totalRating += rating;
            validRatings++;
          }
        }
      });
      
      // Prepare chart data
      const chartData = [
        { rating: "5 Stars", count: ratingsCount['5'], fill: "var(--color-5stars)" },
        { rating: "4 Stars", count: ratingsCount['4'], fill: "var(--color-4stars)" },
        { rating: "3 Stars", count: ratingsCount['3'], fill: "var(--color-3stars)" },
        { rating: "2 Stars", count: ratingsCount['2'], fill: "var(--color-2stars)" },
        { rating: "1 Star", count: ratingsCount['1'], fill: "var(--color-1star)" }
      ];
      
      setSatisfactionData(chartData);
      setTotalRatings(validRatings);
      
      // Calculate average rating
      if (validRatings > 0) {
        setAverageRating((totalRating / validRatings).toFixed(1));
      }
      
      // For change in rating, we would need historical data to compare
      // This is a placeholder - in a real implementation, you would compare with previous periods
      setRatingChange(0.2);
      
    } catch (error) {
      console.error('Error fetching satisfaction data:', error);
    }
  };

  // Render loading state if data is being fetched
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Customer Analytics</h2>
        <div className="p-8 text-center">Loading analytics data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Customer Analytics</h2>
        
        <Tabs defaultValue="total">
          {/* Total Unique Customers Tab */}
          <TabsContent value="total">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Total Customers
                    </CardTitle>
                    <CardDescription>Monthly customer acquisition</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={uniqueCustomersConfig} className="h-[350px] w-full">
                  <BarChart accessibilityLayer data={uniqueCustomersData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-4 border rounded-lg shadow-lg">
                              <p className="font-bold text-lg mb-2">{label}</p>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Users className="h-4 w-4" />
                                <span>Total Bookings: {payload[0].value}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <TrendingUp className="h-4 w-4" />
                                <span>New Customers: {payload[0].payload.newCustomers}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Repeat className="h-4 w-4" />
                                <span>Returning Customers: {payload[0].payload.returningCustomers}</span>
                              </div>
                              <div className="flex items-center gap-2 text-red-600">
                                <TrendingUp className="h-4 w-4" />
                                <span>Cancelled Bookings: {payload[0].payload.cancelledBookings}</span>
                              </div>
                              <p className={`mt-2 flex items-center gap-2 ${Number(payload[0].payload.percentageChange) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                <TrendingUp className="h-4 w-4" />
                                <span>Change from previous month: {payload[0].payload.percentageChange}%</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="customers" 
                      fill="var(--color-customers)" 
                      radius={4}
                      onClick={(data) => {
                        const currentYear = new Date().getFullYear();
                        const monthDate = parse(data.month, 'MMMM', new Date(currentYear, 0));
                        
                        // Use local timezone for navigation dates
                        const from = startOfMonth(monthDate);
                        const to = endOfMonth(monthDate);
                        
                        from.setHours(0, 0, 0, 0);
                        to.setHours(23, 59, 59, 999);
                        
                        navigate('/all-bookings', {
                          state: {
                            dateRange: { from, to }
                          }
                        });
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default CustomerAnalytics;
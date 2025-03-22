// src/components/Analytics.jsx
import React, { useState, useEffect } from "react";
import CalendarDatePicker from "@/components/ui/CalendarDatePicker";
import { Users, Repeat, X, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
// Import analytics components
import CustomerAnalytics from "./Analytics/CustomerAnalytics";
import BookingAnalytics from "./Analytics/BookingAnalytics";
import ServiceAnalytics from "./Analytics/ServiceAnalytics";
import DogAnalytics from "./Analytics/DogAnalytics";
import ShopAnalytics from "./Analytics/ShopAnalytics";
import FinancialAnalytics from "./Analytics/FinancialAnalytics";
import { supabase } from "../supabase";

function Analytics() {
  // Define date range state with default values
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1), // First day of current year
    to: new Date(new Date().getFullYear(), 11, 31), // Last day of current year
  });

  // Summary metrics state
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [customerGrowth, setCustomerGrowth] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [bookingGrowth, setBookingGrowth] = useState(0);
  const [cancelledBookings, setCancelledBookings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueGrowth, setRevenueGrowth] = useState(0);

  useEffect(() => {
    fetchSummaryData();
  }, [dateRange]);

  const fetchSummaryData = async () => {
    const from = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : '2010-01-01';
    const to = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    try {
      // Calculate the previous period for growth rate calculation
      const periodDays = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24);
      const previousFrom = new Date(new Date(from).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const previousTo = new Date(new Date(from).getTime() - 1).toISOString().split('T')[0];

      // Fetch current period bookings data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('historical_bookings')
        .select('contact_number, status, services, booking_date')
        .gte('booking_date', from)
        .lte('booking_date', to);

      // Fetch previous period bookings data
      const { data: previousBookingsData, error: previousBookingsError } = await supabase
        .from('historical_bookings')
        .select('contact_number, status, services, booking_date')
        .gte('booking_date', previousFrom)
        .lte('booking_date', previousTo);

      if (bookingsError) throw bookingsError;
      if (previousBookingsError) throw previousBookingsError;

      // Calculate current period metrics
      const uniqueCustomers = [...new Set(bookingsData.map(booking => booking.contact_number))];
      setTotalCustomers(uniqueCustomers.length);
      
      setTotalBookings(bookingsData.length);
      
      const cancelled = bookingsData.filter(booking => booking.status === 'cancelled').length;
      setCancelledBookings(cancelled);

      // Calculate revenue from services
      const revenue = bookingsData.reduce((sum, booking) => {
        if (booking.services && Array.isArray(booking.services)) {
          return sum + booking.services.reduce((serviceSum, service) => {
            return serviceSum + (parseFloat(service.price) || 0);
          }, 0);
        }
        return sum;
      }, 0);
      setTotalRevenue(revenue);

      // Calculate previous period metrics for growth rates
      const previousUniqueCustomers = [...new Set(previousBookingsData.map(booking => booking.contact_number))].length;
      const previousBookings = previousBookingsData.length;
      const previousRevenue = previousBookingsData.reduce((sum, booking) => {
        if (booking.services && Array.isArray(booking.services)) {
          return sum + booking.services.reduce((serviceSum, service) => {
            return serviceSum + (parseFloat(service.price) || 0);
          }, 0);
        }
        return sum;
      }, 0);

      // Calculate growth rates
      const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(1);
      };

      setCustomerGrowth(calculateGrowth(uniqueCustomers.length, previousUniqueCustomers));
      setBookingGrowth(calculateGrowth(bookingsData.length, previousBookings));
      setRevenueGrowth(calculateGrowth(revenue, previousRevenue));
    } catch (error) {
      console.error('Error fetching summary data:', error);
    }
  };

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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="flex items-center p-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <CardContent className="p-0">
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{totalCustomers}</p>
              <div className="flex items-center gap-1 text-xs">
                <span className={customerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {customerGrowth}%
                </span>
                <span className="text-muted-foreground">growth</span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex items-center p-3">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
              <Repeat className="h-4 w-4 text-green-600" />
            </div>
            <CardContent className="p-0">
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="text-2xl font-bold">{totalBookings}</p>
              <div className="flex items-center gap-1 text-xs">
                <span className={bookingGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {bookingGrowth}%
                </span>
                <span className="text-muted-foreground">growth</span>
              </div>
            </CardContent>
          </Card>

          <Card className="flex items-center p-3">
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
              <X className="h-4 w-4 text-red-600" />
            </div>
            <CardContent className="p-0">
              <p className="text-sm text-muted-foreground">Cancelled Bookings</p>
              <p className="text-2xl font-bold">{cancelledBookings}</p>
              <p className="text-xs text-muted-foreground">{((cancelledBookings / totalBookings) * 100).toFixed(1)}% of total</p>
            </CardContent>
          </Card>

          <Card className="flex items-center p-3">
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
              <DollarSign className="h-4 w-4 text-yellow-600" />
            </div>
            <CardContent className="p-0">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
              <div className="flex items-center gap-1 text-xs">
                <span className={revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {revenueGrowth}%
                </span>
                <span className="text-muted-foreground">growth</span>
              </div>
            </CardContent>
          </Card>
        </div>
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
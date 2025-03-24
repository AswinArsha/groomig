// src/components/Analytics/SummaryCards.jsx
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, XCircle, DollarSign, CreditCard } from "lucide-react";
import { supabase } from "../../supabase";

const SummaryCards = ({ dateRange }) => {
  const [summaryData, setSummaryData] = useState({
    totalCustomers: 0,
    totalBookings: 0,
    totalCancelled: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    creditRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      setIsLoading(true);
      try {
        // Format dates for Supabase query
        const fromDate = dateRange.from.toISOString().split('T')[0];
        const toDate = dateRange.to.toISOString().split('T')[0];

        // Get all bookings in date range
        const { data: bookings, error } = await supabase
          .from('historical_bookings')
          .select('*')
          .gte('booking_date', fromDate)
          .lte('booking_date', toDate);

        if (error) throw error;

        // Calculate summary metrics
        const uniqueCustomers = new Set(bookings.map(booking => booking.contact_number)).size;
        const totalBookings = bookings.length;
        const cancelledBookings = bookings.filter(booking => booking.status === 'cancelled').length;
        
        // Calculate revenue metrics
        let totalRevenue = 0;
        let paidRevenue = 0;
        let creditRevenue = 0;

        bookings.forEach(booking => {
          // Skip cancelled bookings for revenue calculation
          if (booking.status === 'cancelled') return;
          
          // Calculate booking revenue from services
          const bookingRevenue = booking.services?.reduce((sum, service) => {
            return sum + (service.price || 0);
          }, 0) || 0;
          
          totalRevenue += bookingRevenue;
          
          // Separate paid revenue from credit
          if (booking.payment_mode === 'credit') {
            creditRevenue += bookingRevenue;
          } else {
            paidRevenue += bookingRevenue;
          }
        });

        setSummaryData({
          totalCustomers: uniqueCustomers,
          totalBookings,
          totalCancelled: cancelledBookings,
          totalRevenue,
          paidRevenue,
          creditRevenue,
        });
      } catch (error) {
        console.error("Error fetching summary data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (dateRange.from && dateRange.to) {
      fetchSummaryData();
    }
  }, [dateRange]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Total Customers Card */}
      <Card className="bg-white shadow-md">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="rounded-full bg-blue-100 p-3 mb-2">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Total Customers</p>
          <h3 className="text-2xl font-bold mt-1">
            {isLoading ? "..." : summaryData.totalCustomers}
          </h3>
        </CardContent>
      </Card>

      {/* Total Bookings Card */}
      <Card className="bg-white shadow-md">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="rounded-full bg-green-100 p-3 mb-2">
            <Calendar className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Total Bookings</p>
          <h3 className="text-2xl font-bold mt-1">
            {isLoading ? "..." : summaryData.totalBookings}
          </h3>
        </CardContent>
      </Card>

      {/* Cancelled Bookings Card */}
      <Card className="bg-white shadow-md">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="rounded-full bg-red-100 p-3 mb-2">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Cancelled</p>
          <h3 className="text-2xl font-bold mt-1">
            {isLoading ? "..." : summaryData.totalCancelled}
          </h3>
        </CardContent>
      </Card>

      {/* Total Revenue Card */}
      <Card className="bg-white shadow-md">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="rounded-full bg-purple-100 p-3 mb-2">
            <DollarSign className="h-6 w-6 text-purple-600" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
          <h3 className="text-2xl font-bold mt-1">
            {isLoading ? "..." : formatCurrency(summaryData.totalRevenue)}
          </h3>
        </CardContent>
      </Card>

      {/* Received Revenue Card */}
      <Card className="bg-white shadow-md">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="rounded-full bg-emerald-100 p-3 mb-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Received Revenue</p>
          <h3 className="text-2xl font-bold mt-1">
            {isLoading ? "..." : formatCurrency(summaryData.paidRevenue)}
          </h3>
          <p className="text-xs text-gray-400 mt-1">(cash, UPI, swipe)</p>
        </CardContent>
      </Card>

      {/* Pending Revenue Card */}
      <Card className="bg-white shadow-md">
        <CardContent className="p-4 flex flex-col items-center justify-center">
          <div className="rounded-full bg-yellow-100 p-3 mb-2">
            <CreditCard className="h-6 w-6 text-yellow-600" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Pending Revenue</p>
          <h3 className="text-2xl font-bold mt-1">
            {isLoading ? "..." : formatCurrency(summaryData.creditRevenue)}
          </h3>
          <p className="text-xs text-gray-400 mt-1">(credit)</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryCards;
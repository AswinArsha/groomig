// src/components/analytics/ServicePopularity.jsx
import React, { useState, useEffect } from "react";
import { 
  Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer,
  LineChart, Line, Tooltip, Legend 
} from "recharts";
import { supabase } from "../../supabase";
import { ScissorsLineDashed, TrendingUp, RefreshCw } from "lucide-react";
import { format } from "date-fns";
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

const ServicePopularity = ({ dateRange }) => {
  const [servicesData, setServicesData] = useState([]);
  const [servicesTrendData, setServicesTrendData] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBookings, setTotalBookings] = useState(0);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchServicesData();
    }
  }, [dateRange]);

  const fetchServicesData = async () => {
    setIsLoading(true);
    try {
      // Get bookings with date range filter
      let query = supabase
        .from("historical_bookings")
        .select("*");
      
      // Apply date range filter
      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        query = query.gte("booking_date", fromDate.toISOString().split('T')[0]);
      }
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        query = query.lte("booking_date", toDate.toISOString().split('T')[0]);
      }
      
      query = query.order("booking_date", { ascending: false });
      
      const { data, error } = await query;

      if (error) throw error;
      
      // Process data for service popularity
      const { servicesByPopularity, servicesByMonth } = processServicesData(data);
      setServicesData(servicesByPopularity);
      setServicesTrendData(servicesByMonth);
      
      // Get top 5 services for trend chart
      const top5 = servicesByPopularity.slice(0, 5).map(service => service.name);
      setTopServices(top5);
      
      // Set total bookings
      setTotalBookings(data.length);
    } catch (error) {
      console.error("Error fetching services data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processServicesData = (data) => {
    if (!data || data.length === 0) {
      return { servicesByPopularity: [], servicesByMonth: [] };
    }
    
    // Count service occurrences
    const serviceCounts = {};
    
    // Also track services by month for trend analysis
    const servicesByMonthMap = {};
    
    data.forEach(booking => {
      try {
        if (!booking.services) return;
        
        const services = typeof booking.services === 'string' 
          ? JSON.parse(booking.services) 
          : booking.services;
          
        const bookingDate = new Date(booking.booking_date);
        const monthYear = `${bookingDate.toLocaleString('default', { month: 'short' })} ${bookingDate.getFullYear()}`;
        
        if (!servicesByMonthMap[monthYear]) {
          servicesByMonthMap[monthYear] = {};
        }
        
        services.forEach(service => {
          const serviceName = service.name || 'Unknown Service';
          const servicePrice = Number(service.price) || 0;
          
          // Update overall counts
          if (!serviceCounts[serviceName]) {
            serviceCounts[serviceName] = {
              count: 0,
              revenue: 0
            };
          }
          
          serviceCounts[serviceName].count += 1;
          serviceCounts[serviceName].revenue += servicePrice;
          
          // Update monthly counts
          if (!servicesByMonthMap[monthYear][serviceName]) {
            servicesByMonthMap[monthYear][serviceName] = 0;
          }
          
          servicesByMonthMap[monthYear][serviceName] += 1;
        });
      } catch (error) {
        console.error("Error processing service data:", error);
      }
    });
    
    // Convert to array for overall popularity chart
    const servicesByPopularity = Object.entries(serviceCounts).map(([name, data]) => ({
      name,
      count: data.count,
      revenue: data.revenue,
      averagePrice: data.count > 0 ? Math.round(data.revenue / data.count) : 0
    }));
    
    // Sort by count (most popular first)
    servicesByPopularity.sort((a, b) => b.count - a.count);
    
    // Process monthly data for trend chart
    // Convert the month map to an array of objects with month and service counts
    const months = Object.keys(servicesByMonthMap).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA - dateB;
    });
    
    const servicesByMonth = months.map(month => {
      const monthData = { month };
      Object.entries(servicesByMonthMap[month]).forEach(([service, count]) => {
        monthData[service] = count;
      });
      return monthData;
    });
    
    return { 
      servicesByPopularity, 
      servicesByMonth: servicesByMonth.slice(-12) // Last 12 months only
    };
  };

  // Chart configurations for bar chart
  const serviceChartConfig = servicesData.reduce((config, service, index) => {
    const chartColors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))"
    ];
    const key = `service${index + 1}`;
    config[key] = { 
      label: service.name, 
      color: chartColors[index % chartColors.length] 
    };
    return config;
  }, {});

  // Chart configuration for trend chart
  const trendChartConfig = topServices.reduce((config, serviceName, index) => {
    const chartColors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))"
    ];
    // Using the service name as key (with safe characters)
    const key = serviceName.replace(/\s+/g, '_').toLowerCase();
    config[key] = { 
      label: serviceName, 
      color: chartColors[index % chartColors.length] 
    };
    return config;
  }, {});

  // Create dynamic COLORS array based on chart data
  const SERVICE_COLORS = servicesData.map((_, index) => {
    const colorKeys = ["service1", "service2", "service3", "service4", "service5"];
    return `var(--color-${colorKeys[index % colorKeys.length]})`;
  });

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  };

  // Format date range for display
  const formatDateRangeDisplay = () => {
    if (!dateRange || !dateRange.from || !dateRange.to) {
      return "All time";
    }
    
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    
    return `${format(from, "MMM d, yyyy")} - ${format(to, "MMM d, yyyy")}`;
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Service Popularity</CardTitle>
            <CardDescription>Analyze which services are most requested by customers</CardDescription>
          </div>
          <div className="bg-primary/10 px-3 py-1 rounded-full text-sm">
            {formatDateRangeDisplay()}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center">
          <div>
            <p className="text-lg text-muted-foreground">Total Service Bookings</p>
            <h3 className="text-3xl font-bold">{totalBookings.toLocaleString()}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Popular Services Bar Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Most Popular Services</h3>
            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : servicesData.length === 0 ? (
              <div className="flex justify-center items-center h-80 bg-gray-50 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">No service data available</p>
                  <p className="text-sm text-muted-foreground">
                    Complete some bookings to see service popularity
                  </p>
                </div>
              </div>
            ) : (
              <ChartContainer
                config={serviceChartConfig}
                className="h-80 w-full"
              >
                <BarChart
                  data={servicesData.slice(0, 10)} // Top 10 services only
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    tickFormatter={(value) => 
                      value.length > 15 
                        ? `${value.substring(0, 15)}...` 
                        : value
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, props) => {
                          if (name === "count") {
                            return `${value} bookings`;
                          } else if (name === "revenue") {
                            return formatCurrency(value);
                          } else if (name === "averagePrice") {
                            return `Avg: ${formatCurrency(value)}`;
                          }
                          return value;
                        }}
                      />
                    }
                  />
                  <Bar dataKey="count" name="Bookings" radius={[0, 4, 4, 0]}>
                    {servicesData.slice(0, 10).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </div>

          {/* Service Booking Trends Line Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Service Booking Trends</h3>
            {isLoading ? (
              <div className="flex justify-center items-center h-80">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : servicesTrendData.length === 0 ? (
              <div className="flex justify-center items-center h-80 bg-gray-50 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">No trend data available</p>
                  <p className="text-sm text-muted-foreground">
                    More bookings over time will show service trends
                  </p>
                </div>
              </div>
            ) : (
              <ChartContainer
                config={trendChartConfig}
                className="h-80 w-full"
              >
                <LineChart
                  data={servicesTrendData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tickFormatter={(value) => value.split(' ')[0]} // Just show month, not year
                  />
                  <YAxis />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `${value} bookings`}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {topServices.map((service, index) => {
                    const dataKey = service;
                    const colorKey = service.replace(/\s+/g, '_').toLowerCase();
                    return (
                      <Line
                        key={dataKey}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={`var(--color-${colorKey})`}
                        strokeWidth={2}
                        dot={{ stroke: `var(--color-${colorKey})`, fill: `var(--color-${colorKey})` }}
                        activeDot={{ r: 6 }}
                      />
                    );
                  })}
                </LineChart>
              </ChartContainer>
            )}
          </div>
        </div>

        {/* Service Cards */}
        {!isLoading && servicesData.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-3">Service Performance Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servicesData.slice(0, 6).map((service, index) => (
                <div 
                  key={service.name}
                  className="p-4 border rounded-md"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: SERVICE_COLORS[index % SERVICE_COLORS.length],
                        color: 'white'
                      }}
                    >
                      <ScissorsLineDashed className="h-4 w-4" />
                    </div>
                    <span className="font-medium truncate">{service.name}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-sm text-muted-foreground">Bookings</div>
                      <div className="text-lg font-bold">{service.count}</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-sm text-muted-foreground">Revenue</div>
                      <div className="text-lg font-bold">{formatCurrency(service.revenue)}</div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Average Price</span>
                      <span className="font-medium">{formatCurrency(service.averagePrice)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-muted-foreground">Popularity</span>
                      <span className="font-medium">
                        {Math.round((service.count / totalBookings) * 100)}% of bookings
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Based on {totalBookings} bookings from {formatDateRangeDisplay()}
        </div>
        <button
          onClick={fetchServicesData}
          className="flex items-center gap-1 text-sm text-primary"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </CardFooter>
    </Card>
  );
};

export default ServicePopularity;
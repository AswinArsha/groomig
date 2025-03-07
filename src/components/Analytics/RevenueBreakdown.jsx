// src/components/analytics/RevenueBreakdown.jsx
import React, { useState, useEffect } from "react";
import { 
  Pie, PieChart, Cell, ResponsiveContainer, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip 
} from "recharts";
import { supabase } from "../../supabase";
import { ScissorsLineDashed, Store, RefreshCw } from "lucide-react";
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
} from "@/components/ui/chart";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const RevenueBreakdown = ({ dateRange }) => {
  const [serviceData, setServiceData] = useState([]);
  const [locationData, setLocationData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchRevenueBreakdown();
    }
  }, [dateRange]);

  const fetchRevenueBreakdown = async () => {
    setIsLoading(true);
    try {
      // Get completed bookings with date range filter
      let query = supabase
        .from("historical_bookings")
        .select("*")
        .eq("status", "completed");
      
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
      
      // Process data for service breakdown
      const services = processServiceData(data);
      setServiceData(services);
      
      // Process data for location breakdown
      const locations = await processLocationData(data);
      setLocationData(locations);
      
      // Calculate total revenue
      const total = data.reduce((sum, booking) => {
        try {
          let bookingRevenue = 0;
          if (booking.services) {
            const services = typeof booking.services === 'string' 
              ? JSON.parse(booking.services) 
              : booking.services;
              
            bookingRevenue = services.reduce((serviceSum, service) => 
              serviceSum + (Number(service.price) || 0), 0);
          }
          return sum + bookingRevenue;
        } catch (error) {
          console.error("Error calculating booking revenue:", error);
          return sum;
        }
      }, 0);
      
      setTotalRevenue(total);
    } catch (error) {
      console.error("Error fetching revenue breakdown:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processServiceData = (data) => {
    if (!data || data.length === 0) return [];
    
    // Extract all services from bookings
    const serviceRevenue = {};
    
    data.forEach(booking => {
      try {
        if (booking.services) {
          const services = typeof booking.services === 'string' 
            ? JSON.parse(booking.services) 
            : booking.services;
            
          services.forEach(service => {
            const serviceName = service.name || 'Unknown Service';
            const price = Number(service.price) || 0;
            
            if (!serviceRevenue[serviceName]) {
              serviceRevenue[serviceName] = {
                revenue: 0,
                count: 0
              };
            }
            
            serviceRevenue[serviceName].revenue += price;
            serviceRevenue[serviceName].count += 1;
          });
        }
      } catch (error) {
        console.error("Error processing service data:", error);
      }
    });
    
    // Convert to array for chart
    let serviceArray = Object.entries(serviceRevenue).map(([name, data]) => ({
      name,
      value: data.revenue,
      count: data.count
    }));
    
    // Sort by revenue
    serviceArray.sort((a, b) => b.value - a.value);
    
    // Top 5 services, group others if needed
    if (serviceArray.length > 5) {
      const top5 = serviceArray.slice(0, 5);
      const others = serviceArray.slice(5);
      
      const othersRevenue = others.reduce((sum, service) => sum + service.value, 0);
      const othersCount = others.reduce((sum, service) => sum + service.count, 0);
      
      if (othersRevenue > 0) {
        top5.push({
          name: "Other Services",
          value: othersRevenue,
          count: othersCount
        });
      }
      
      serviceArray = top5;
    }
    
    return serviceArray;
  };

  const processLocationData = async (data) => {
    if (!data || data.length === 0) return [];
    
    // Get shop information to map shop_ids to names
    const { data: shops, error } = await supabase
      .from('shops') // Assuming you have a shops table
      .select('id, name');
      
    // Create a map of shop_id to shop_name
    const shopMap = {};
    if (shops) {
      shops.forEach(shop => {
        shopMap[shop.id] = shop.name;
      });
    }
    
    // Group revenue by shop_id
    const locationRevenue = {};
    
    data.forEach(booking => {
      try {
        const shopId = booking.shop_id;
        // Use shop name from map or fallback to ID or "Unknown"
        const shopName = (shopId && shopMap[shopId]) ? shopMap[shopId] : (shopId || 'Unknown Location');
        
        if (!locationRevenue[shopName]) {
          locationRevenue[shopName] = {
            revenue: 0,
            count: 0
          };
        }
        
        // Calculate revenue from services
        let bookingRevenue = 0;
        if (booking.services) {
          const services = typeof booking.services === 'string' 
            ? JSON.parse(booking.services) 
            : booking.services;
            
          bookingRevenue = services.reduce((sum, service) => 
            sum + (Number(service.price) || 0), 0);
        }
        
        locationRevenue[shopName].revenue += bookingRevenue;
        locationRevenue[shopName].count += 1;
      } catch (error) {
        console.error("Error processing location data:", error);
      }
    });
    
    // Convert to array for chart
    const locationArray = Object.entries(locationRevenue).map(([name, data]) => ({
      name,
      value: data.revenue,
      count: data.count
    }));
    
    // Sort by revenue
    return locationArray.sort((a, b) => b.value - a.value);
  };

  // Chart configurations
  const serviceChartConfig = {
    service1: { label: serviceData[0]?.name || "Service 1", color: "hsl(var(--chart-1))" },
    service2: { label: serviceData[1]?.name || "Service 2", color: "hsl(var(--chart-2))" },
    service3: { label: serviceData[2]?.name || "Service 3", color: "hsl(var(--chart-3))" },
    service4: { label: serviceData[3]?.name || "Service 4", color: "hsl(var(--chart-4))" },
    service5: { label: serviceData[4]?.name || "Service 5", color: "hsl(var(--chart-5))" },
    otherServices: { label: "Other Services", color: "hsl(var(--muted-foreground))" }
  };

  const locationChartConfig = locationData.reduce((config, location, index) => {
    const chartColors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))"
    ];
    const key = `location${index + 1}`;
    config[key] = { 
      label: location.name, 
      color: chartColors[index % chartColors.length] 
    };
    return config;
  }, {});

  // Create dynamic COLORS array based on chart data
  const SERVICE_COLORS = [
    "var(--color-service1)",
    "var(--color-service2)",
    "var(--color-service3)",
    "var(--color-service4)",
    "var(--color-service5)",
    "var(--color-otherServices)"
  ];

  const LOCATION_COLORS = locationData.map((_, index) => {
    const colorKeys = ["location1", "location2", "location3", "location4", "location5"];
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
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Revenue by service type and location</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center">
          <div>
            <p className="text-lg text-muted-foreground">Total Revenue</p>
            <h3 className="text-3xl font-bold">{formatCurrency(totalRevenue)}</h3>
          </div>
          <div className="bg-primary/10 px-3 py-1 rounded-full text-sm">
            {formatDateRangeDisplay()}
          </div>
        </div>

        <Tabs defaultValue="services">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services" className="flex items-center gap-2">
              <ScissorsLineDashed className="h-4 w-4" />
              By Service
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              By Location
            </TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="pt-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : serviceData.length === 0 ? (
              <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">No service data available</p>
                  <p className="text-sm text-muted-foreground">
                    Complete some bookings to see service revenue breakdown
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2">
                  <ChartContainer
                    config={serviceChartConfig}
                    className="h-64 mx-auto"
                  >
                    <PieChart>
                      <Pie
                        data={serviceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {serviceData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={SERVICE_COLORS[index % SERVICE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatCurrency(value)}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                </div>

                <div className="md:w-1/2 mt-4 md:mt-0">
                  <div className="space-y-3">
                    {serviceData.map((service, index) => (
                      <div key={service.name} className="p-3 border rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                SERVICE_COLORS[index % SERVICE_COLORS.length],
                            }}
                          ></div>
                          <span className="font-medium truncate">{service.name}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <div className="text-xl font-bold">{formatCurrency(service.value)}</div>
                          <div className="text-sm text-muted-foreground">
                            {service.count} bookings
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${(service.value / totalRevenue) * 100}%`,
                              backgroundColor:
                                SERVICE_COLORS[index % SERVICE_COLORS.length],
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="locations" className="pt-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : locationData.length === 0 ? (
              <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">No location data available</p>
                  <p className="text-sm text-muted-foreground">
                    Complete some bookings to see location revenue breakdown
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <ChartContainer
                  config={locationChartConfig}
                  className="h-64 w-full"
                >
                  <BarChart
                    data={locationData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                    />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(value)}
                        />
                      }
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {locationData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={LOCATION_COLORS[index % LOCATION_COLORS.length]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {locationData.map((location, index) => (
                    <div 
                      key={location.name}
                      className="flex items-center p-3 border rounded-md"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                        style={{
                          backgroundColor: LOCATION_COLORS[index % LOCATION_COLORS.length],
                          color: 'white'
                        }}
                      >
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium">{location.name}</div>
                        <div className="flex gap-3 text-sm">
                          <span className="font-semibold">{formatCurrency(location.value)}</span>
                          <span className="text-muted-foreground">
                            {location.count} bookings
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Based on data from {formatDateRangeDisplay()}
        </div>
        <button
          onClick={fetchRevenueBreakdown}
          className="flex items-center gap-1 text-sm text-primary"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </CardFooter>
    </Card>
  );
};

export default RevenueBreakdown;
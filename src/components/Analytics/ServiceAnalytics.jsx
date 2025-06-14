// src/components/Analytics/ServiceAnalytics.jsx
import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Package, 
  IndianRupee,
  BarChart as BarChartIcon
} from "lucide-react";
import { 
  Bar, 
  BarChart, 
  Pie, 
  PieChart, 
  Cell,
  CartesianGrid, 
  XAxis,
  YAxis,
  LabelList,
  Tooltip,
  Legend,
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
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "../../supabase"; // Adjust path as needed

function ServiceAnalytics({ dateRange, organizationId }) {
  const [popularServicesData, setPopularServicesData] = useState([]);
  const [revenueByServiceData, setRevenueByServiceData] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [topService, setTopService] = useState({ name: '', count: 0 });
  const [highestRevenueService, setHighestRevenueService] = useState({ name: '', revenue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Chart configurations
  const popularServicesConfig = {
    count: {
      label: "Bookings Count",
      color: "hsl(var(--chart-3))",
    }
  };

  const revenueConfig = {
    revenue: {
      label: "Revenue Distribution",
      color: "hsl(var(--chart-4))",
    }
  };

  useEffect(() => {
    fetchServiceData();
  }, [dateRange, organizationId]);

  const fetchServiceData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchPopularServicesData(),
        fetchRevenueByServiceData()
      ]);
    } catch (error) {
      console.error("Error fetching service analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPopularServicesData = async () => {
    if (!organizationId) {
      setPopularServicesData([]); // Clear or set to default
      setTopService({ name: '', count: 0 });
      return;
    }
    // Convert dates to IST by adding 5 hours and 30 minutes
    const fromDate = dateRange?.from ? new Date(dateRange.from.getTime() + (5.5 * 60 * 60 * 1000)) : new Date('2010-01-01');
    const toDate = dateRange?.to ? new Date(dateRange.to.getTime() + (5.5 * 60 * 60 * 1000)) : new Date();
    
    // Format dates in YYYY-MM-DD format for Supabase query
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    
    try {
      // Fetch bookings with services data
      const { data, error } = await supabase
        .from('historical_bookings')
        .select('services')
        .gte('booking_date', from)
        .lte('booking_date', to)
        .eq('organization_id', organizationId)
        .not('services', 'is', null);
        
      if (error) throw error;
      
      // Process services data
      const servicesCount = {};
      
      data.forEach(booking => {
        if (booking.services && Array.isArray(booking.services)) {
          booking.services.forEach(service => {
            if (service && service.name) {
              const serviceName = service.name;
              
              if (!servicesCount[serviceName]) {
                servicesCount[serviceName] = 0;
              }
              
              servicesCount[serviceName]++;
            }
          });
        }
      });
      
      // Convert to array for chart
      const chartData = Object.keys(servicesCount).map(serviceName => ({
        name: serviceName,
        count: servicesCount[serviceName]
      }));
      
      // Sort by count (descending)
      chartData.sort((a, b) => b.count - a.count);
      
      // Set the most popular service
      if (chartData.length > 0) {
        setTopService({
          name: chartData[0].name,
          count: chartData[0].count
        });
      }
      
      setPopularServicesData(chartData);
      
    } catch (error) {
      console.error('Error fetching popular services data:', error);
    }
  };

  const fetchRevenueByServiceData = async () => {
    if (!organizationId) {
      setRevenueByServiceData([]); // Clear or set to default
      setTotalRevenue(0);
      setHighestRevenueService({ name: '', revenue: 0 });
      return;
    }
    // Convert dates to IST by adding 5 hours and 30 minutes
    const fromDate = dateRange?.from ? new Date(dateRange.from.getTime() + (5.5 * 60 * 60 * 1000)) : new Date('2010-01-01');
    const toDate = dateRange?.to ? new Date(dateRange.to.getTime() + (5.5 * 60 * 60 * 1000)) : new Date();
    
    // Format dates in YYYY-MM-DD format for Supabase query
    const from = fromDate.toISOString().split('T')[0];
    const to = toDate.toISOString().split('T')[0];
    
    try {
      // Fetch bookings with services data
      const { data, error } = await supabase
        .from('historical_bookings')
        .select('services')
        .gte('booking_date', from)
        .lte('booking_date', to)
        .eq('organization_id', organizationId)
        .not('services', 'is', null);
        
      if (error) throw error;
      
      // Process services data for revenue
      const servicesRevenue = {};
      let totalRev = 0;
      
      data.forEach(booking => {
        if (booking.services && Array.isArray(booking.services)) {
          booking.services.forEach(service => {
            if (service && service.name && service.price) {
              const serviceName = service.name;
              const price = parseFloat(service.price) || 0;
              
              if (!servicesRevenue[serviceName]) {
                servicesRevenue[serviceName] = 0;
              }
              
              servicesRevenue[serviceName] += price;
              totalRev += price;
            }
          });
        }
      });
      
      // Convert to array for chart
      const chartData = Object.keys(servicesRevenue).map(serviceName => ({
        name: serviceName,
        revenue: servicesRevenue[serviceName],
        fill: `var(--color-${serviceName.toLowerCase().replace(/\s+/g, '-')})` // Create dynamic color variables
      }));
      
      // Sort by revenue (descending)
      chartData.sort((a, b) => b.revenue - a.revenue);
      
      // Set the highest revenue service
      if (chartData.length > 0) {
        setHighestRevenueService({
          name: chartData[0].name,
          revenue: chartData[0].revenue
        });
      }
      
      setRevenueByServiceData(chartData);
      setTotalRevenue(totalRev);
      
    } catch (error) {
      console.error('Error fetching revenue by service data:', error);
    }
  };

  const formatCurrency = (value) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Service Analytics</h2>
        <div className="p-8 text-center">Loading service analytics data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Service Analytics</h2>
      
      <Tabs defaultValue="popular">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="popular">Popular Services</TabsTrigger>
          <TabsTrigger value="revenue">Revenue by Service</TabsTrigger>
        </TabsList>
        
        {/* Popular Services Tab */}
        <TabsContent value="popular">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Package className="h-5 w-5" />
                    <span className="hidden md:inline">Most</span> Popular Services
                  </CardTitle>
                  <CardDescription className="hidden sm:block">Services by booking frequency</CardDescription>
                </div>
                <div className="text-lg font-medium">
                  {topService.name ? (
                    <>
                      <span className="hidden md:inline">Top: </span>
                      {topService.name}
                    </>
                  ) : 'No data'}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {popularServicesData.length > 0 ? (
                <div>
                <div className="overflow-x-auto overflow-y-hidden">
                  <div className="-ml-28 sm:flex sm:justify-center">
                  <ChartContainer config={popularServicesConfig} className="h-[300px] mt-10 -mb-14 min-w-[600px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        accessibilityLayer
                        data={popularServicesData.slice(0, 8)} // Show top 8 services
                        layout="horizontal"
                        margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                      >
                        <CartesianGrid vertical strokeDasharray="3 3" />
                        <XAxis 
                          type="category" 
                          dataKey="name"
                          height={40}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis type="number" />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="hsl(var(--chart-3))" 
                          radius={[4, 4, 0, 0]} 
                        >
                          <LabelList dataKey="count" position="top" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
               
                </div>
                <div className="w-full mt-8">
                  <div className="h-[250px] overflow-y-auto">
                    <table className="min-w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">Service</th>
                          <th className="text-right p-2">Bookings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {popularServicesData.map((service, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">{service.name}</td>
                            <td className="text-right p-2">{service.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                </div>

                
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No service data available for the selected period
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
              <div className="flex gap-2 font-medium leading-none">
                {topService.count > 0 ? (
                  <>Most booked service: {topService.name} ({topService.count} bookings)</>
                ) : (
                  <>No service data available</>
                )}
              </div>
              <div className="leading-none text-muted-foreground">
                Based on {popularServicesData.reduce((sum, item) => sum + item.count, 0)} total service bookings
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Revenue by Service Tab */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl ">
                    <IndianRupee className="h-5 w-5" />
                    <span className="block md:hidden">Revenue</span>
                    <span className="hidden md:block">Revenue by Service</span>
                  </CardTitle>
                  <CardDescription className="hidden sm:block">Service revenue distribution</CardDescription>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {revenueByServiceData.length > 0 ? (
                <div className="w-full flex flex-col sm:flex-row gap-4">
                  <div className="w-full -ml-20 sm:w-1/2">
                    <ChartContainer
                      config={revenueConfig}
                      className="h-[250px]"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={(props) => {
                            const { active, payload } = props;
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-card p-3 border shadow-lg rounded-lg">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: data.fill }}
                                    />
                                    <p className="font-semibold text-card-foreground">{data.name}</p>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <IndianRupee className="h-4 w-4" />
                                    <span className="font-medium text-card-foreground">
                                      {formatCurrency(data.revenue)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {Math.round((data.revenue / totalRevenue) * 100)}% of total revenue
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Pie
                          data={revenueByServiceData}
                          dataKey="revenue"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${Math.round((entry.revenue / totalRevenue) * 100)}%`}
                        >
                          {revenueByServiceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 8) + 1}))`} />
                          ))}
                        </Pie>
                        // Removed ChartLegend component
                      </PieChart>
                    </ChartContainer>
                  </div>
                  
                  <div className="w-full sm:w-1/2">
                    <div className="h-[250px] overflow-y-auto">
                      <table className="min-w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2">Service</th>
                            <th className="text-right p-2">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {revenueByServiceData.map((service, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">{service.name}</td>
                              <td className="text-right p-2">{formatCurrency(service.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No revenue data available for the selected period
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
              <div className="flex gap-2 font-medium leading-none">
                {highestRevenueService.revenue > 0 ? (
                  <>
                    <BarChartIcon className="h-4 w-4 text-green-500" />
                    Highest revenue service: {highestRevenueService.name} ({formatCurrency(highestRevenueService.revenue)})
                  </>
                ) : (
                  <>No revenue data available</>
                )}
              </div>
              <div className="leading-none text-muted-foreground">
                Total revenue from all services: {formatCurrency(totalRevenue)}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ServiceAnalytics;
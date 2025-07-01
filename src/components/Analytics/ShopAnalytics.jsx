// src/components/Analytics/ShopAnalytics.jsx
import React, { useState, useEffect } from "react";
import { 
  Store, 
  BarChart3, 
  IndianRupee,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  PieChart as PieChartIcon
} from "lucide-react";
import { 
  Bar, 
  BarChart, 
  Pie, 
  PieChart, 
  CartesianGrid, 
  XAxis,
  YAxis,
  Cell,
  Legend,
  LabelList,
  Tooltip
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

import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { supabase } from "../../supabase"; // Adjust path as needed

function ShopAnalytics({ dateRange, organizationId }) {
  const [shopPerformanceData, setShopPerformanceData] = useState([]);
  const [shopRevenueData, setShopRevenueData] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("total_bookings");
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [topShop, setTopShop] = useState({ name: '', revenue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Chart configurations
  const shopPerformanceConfig = {
    total_bookings: {
      label: "Total Bookings",
      color: "hsl(var(--chart-1))",
    },
    completed_bookings: {
      label: "Completed Bookings",
      color: "hsl(var(--chart-2))",
    },
    cancelled_bookings: {
      label: "Cancelled Bookings",
      color: "hsl(var(--chart-3))",
    },
    avg_satisfaction: {
      label: "Avg. Satisfaction ",
      color: "hsl(var(--chart-4))",
    }
  };

  const shopRevenueConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-2))",
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [dateRange, organizationId]);

  const fetchShopData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchShopPerformanceData(),
        fetchShopRevenueData()
      ]);
    } catch (error) {
      console.error("Error fetching shop analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShopPerformanceData = async () => {
    if (!organizationId) {
      setShopPerformanceData([]); // Clear or set to default
      return;
    }

    // Convert dates to IST by adding 5:30 hours before converting to date string
    const from = dateRange?.from
      ? new Date(dateRange.from.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0]
      : '2010-01-01';
    const to = dateRange?.to
      ? new Date(dateRange.to.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0]
      : new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    try {
      // Fetch bookings with shop, status, and feedback data
      const query = supabase
        .from('historical_bookings')
        .select('shop_name, status, feedback')
        .eq('organization_id', organizationId)
        .gte('booking_date', from)
        .lte('booking_date', to)
        .not('shop_name', 'is', null);
      
      const { data, error } = await query;
        
      if (error) throw error;
      
      // Group by shop and calculate metrics
      const shopMetrics = {};
      
      data.forEach(booking => {
        const shopName = booking.shop_name;
        
        if (!shopName) return;
        
        if (!shopMetrics[shopName]) {
          shopMetrics[shopName] = {
            shop_name: shopName,
            total_bookings: 0,
            completed_bookings: 0,
            cancelled_bookings: 0,
            ratings_sum: 0,
            ratings_count: 0
          };
        }
        
        // Increment total bookings
        shopMetrics[shopName].total_bookings++;
        
        // Track completed and cancelled bookings
        if (booking.status === 'completed') {
          shopMetrics[shopName].completed_bookings++;
          
          // Track ratings if available
          if (booking.feedback && booking.feedback.rating) {
            const rating = parseInt(booking.feedback.rating);
            if (rating >= 1 && rating <= 5) {
              shopMetrics[shopName].ratings_sum += rating;
              shopMetrics[shopName].ratings_count++;
            }
          }
        } else if (booking.status === 'cancelled') {
          shopMetrics[shopName].cancelled_bookings++;
        }
      });
      
      // Calculate derived metrics
      const chartData = Object.values(shopMetrics).map(shop => {
        // Calculate cancellation rate
        const cancellationRate = shop.total_bookings > 0 
          ? (shop.cancelled_bookings / shop.total_bookings) * 100 
          : 0;
          
        // Calculate average satisfaction
        const avgSatisfaction = shop.ratings_count > 0 
          ? shop.ratings_sum / shop.ratings_count 
          : 0;
        
        return {
          shop_name: shop.shop_name,
          total_bookings: shop.total_bookings,
          completed_bookings: shop.completed_bookings,
          cancelled_bookings: shop.cancelled_bookings,
          avg_satisfaction: parseFloat(avgSatisfaction.toFixed(1))
        };
      });
      
      // Sort by total bookings by default
      chartData.sort((a, b) => b.total_bookings - a.total_bookings);
      
      setShopPerformanceData(chartData);
      
    } catch (error) {
      console.error('Error fetching shop performance data:', error);
    }
  };

  const fetchShopRevenueData = async () => {
    if (!organizationId) {
      setShopRevenueData([]); // Clear or set to default
      setTotalRevenue(0);
      setTopShop({ name: '', revenue: 0 });
      return;
    }

    // Convert dates to IST by adding 5:30 hours before converting to date string
    const from = dateRange?.from
      ? new Date(dateRange.from.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0]
      : '2010-01-01';
    const to = dateRange?.to
      ? new Date(dateRange.to.getTime() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0]
      : new Date(Date.now() + (5.5 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    try {
      // Fetch bookings with shop and services data
      const query = supabase
        .from('historical_bookings')
        .select('shop_name, services')
        .eq('organization_id', organizationId)
        .gte('booking_date', from)
        .lte('booking_date', to)
        .not('shop_name', 'is', null);
      
      const { data, error } = await query;
        
      if (error) throw error;
      
      // Group by shop and calculate revenue
      const shopRevenue = {};
      let total = 0;
      
      data.forEach(booking => {
        const shopName = booking.shop_name;
        
        if (!shopName) return;
        
        if (!shopRevenue[shopName]) {
          shopRevenue[shopName] = 0;
        }
        
        // Calculate revenue from services
        if (booking.services && Array.isArray(booking.services)) {
          booking.services.forEach(service => {
            if (service && service.price) {
              const price = parseFloat(service.price) || 0;
              shopRevenue[shopName] += price;
              total += price;
            }
          });
        }
      });
      
      // Convert to array for chart
      const chartData = Object.keys(shopRevenue).map(shopName => ({
        shop_name: shopName,
        revenue: shopRevenue[shopName],
        fill: `var(--color-${shopName.toLowerCase().replace(/\s+/g, '-')})` // Create dynamic color variables
      }));
      
      // Sort by revenue (descending)
      chartData.sort((a, b) => b.revenue - a.revenue);
      
      // Set top shop by revenue
      if (chartData.length > 0) {
        setTopShop({
          name: chartData[0].shop_name,
          revenue: chartData[0].revenue
        });
      }
      
      setShopRevenueData(chartData);
      setTotalRevenue(total);
      
    } catch (error) {
      console.error('Error fetching shop revenue data:', error);
    }
  };

  const handleMetricChange = (value) => {
    setSelectedMetric(value);
    
    // Sort data based on selected metric
    const sortedData = [...shopPerformanceData];
    sortedData.sort((a, b) => {
      // For most metrics, higher is better
      if (value === 'cancelled_bookings') {
        return a[value] - b[value]; // For cancelled bookings, lower is better
      }
      return b[value] - a[value];
    });
    
    setShopPerformanceData(sortedData);
  };

  const formatCurrency = (value) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const getMetricDescription = () => {
    switch (selectedMetric) {
      case 'total_bookings':
        return 'Total number of bookings received per shop';
      case 'completed_bookings':
        return 'Bookings successfully completed by each shop';
      case 'cancelled_bookings':
        return 'Number of bookings that were cancelled';
      case 'avg_satisfaction':
        return 'Average customer satisfaction rating (1-5 stars)';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Shop Analytics</h2>
        <div className="p-8 text-center">Loading shop analytics data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold hidden sm:block">Shop Analytics</h2>

      
      <Tabs defaultValue="performance">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="performance">Shop Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue by Shop</TabsTrigger>
        </TabsList>
        
        {/* Shop Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl ">
                    <BarChart3 className="h-5 w-5" />
                    <span className="hidden sm:block">Shop</span> Performance
                  </CardTitle>
                  <CardDescription className="hidden sm:block">{getMetricDescription()}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:block">Metric:</span>
                  <Select value={selectedMetric} onValueChange={handleMetricChange}>
                    <SelectTrigger className="w-[100px] sm:w-[180px] h-8">
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total_bookings">Total Bookings</SelectItem>
                      <SelectItem value="completed_bookings">Completed Bookings</SelectItem>
                      <SelectItem value="cancelled_bookings">Cancelled Bookings</SelectItem>
                      <SelectItem value="avg_satisfaction">Avg. Satisfaction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {shopPerformanceData.length > 0 ? (
                <div className="relative w-full overflow-x-auto">
                  <div className="min-w-[500px] -ml-16 md:flex md:justify-center">
                    <ChartContainer config={shopPerformanceConfig} className="h-[300px]">
                      <BarChart
                        accessibilityLayer
                        data={shopPerformanceData}
                        margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="shop_name" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis />
                        <ChartTooltip
                          content={(props) => {
                            const { active, payload } = props;
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const metricLabel = shopPerformanceConfig[selectedMetric].label;
                              return (
                                <div className="bg-card p-3 border shadow-lg rounded-lg">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: `var(--color-${selectedMetric})` }}
                                    />
                                    <p className="font-semibold text-card-foreground">{data.shop_name}</p>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span className="font-medium text-card-foreground">
                                      {metricLabel}: {selectedMetric === 'avg_satisfaction' 
                                        ? data[selectedMetric].toFixed(1)
                                        : data[selectedMetric].toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey={selectedMetric} 
                          fill={`var(--color-${selectedMetric})`}
                          radius={[4, 4, 0, 0]} 
                        >
                          <LabelList 
                            dataKey={selectedMetric} 
                            position="top" 
                            formatter={(value) => selectedMetric === 'avg_satisfaction' ? value : value.toLocaleString()}
                          />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No shop performance data available for the selected period
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
              {shopPerformanceData.length > 0 && (
                <>
                  <div className="font-medium">Key insights:</div>
                  {selectedMetric === 'total_bookings' && (
                    <div className="text-muted-foreground">
                      <strong>{shopPerformanceData[0].shop_name}</strong> leads with {shopPerformanceData[0].total_bookings.toLocaleString()} total bookings
                      {shopPerformanceData.length > 1 && `, which is ${Math.round((shopPerformanceData[0].total_bookings / shopPerformanceData[1].total_bookings - 1) * 100)}% higher than the next shop`}.
                    </div>
                  )}
                  
                  {selectedMetric === 'completed_bookings' && (
                    <div className="text-muted-foreground">
                      <strong>{shopPerformanceData[0].shop_name}</strong> has completed {shopPerformanceData[0].completed_bookings.toLocaleString()} bookings
                      {shopPerformanceData.length > 1 && `, ${Math.round((shopPerformanceData[0].completed_bookings / shopPerformanceData[0].total_bookings) * 100)}% of their total bookings`}.
                    </div>
                  )}
                  
                  {selectedMetric === 'cancellation_rate' && (
                    <div className="text-muted-foreground">
                      <strong>{shopPerformanceData[0].shop_name}</strong> has the lowest cancellation rate at {shopPerformanceData[0].cancellation_rate}%
                      {shopPerformanceData.length > 1 && `, compared to the highest of ${shopPerformanceData[shopPerformanceData.length - 1].cancellation_rate}% for ${shopPerformanceData[shopPerformanceData.length - 1].shop_name}`}.
                    </div>
                  )}
                  
                  {selectedMetric === 'avg_satisfaction' && (
                    <div className="text-muted-foreground">
                      <strong>{shopPerformanceData[0].shop_name}</strong> leads with an average rating of {shopPerformanceData[0].avg_satisfaction}
                      {shopPerformanceData.length > 1 && `, while the average across all shops is ${(shopPerformanceData.reduce((sum, shop) => sum + shop.avg_satisfaction, 0) / shopPerformanceData.length).toFixed(1)}`}.
                    </div>
                  )}
                </>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Revenue by Shop Tab */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <IndianRupee className="h-5 w-5" />
                    Revenue <span className="hidden sm:block">by Shop</span>
                  </CardTitle>
                  <CardDescription className="hidden sm:block">Distribution of revenue across shops</CardDescription>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {shopRevenueData.length > 0 ? (
                <div className="w-full flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-1/2 -ml-20">
                    <ChartContainer
                      config={shopRevenueConfig}
                      className="h-[250px]"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={(props) => {
                            const { active, payload } = props;
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const percentage = Math.round((data.revenue / totalRevenue) * 100);
                              return (
                                <div className="bg-white p-3 border shadow-sm rounded-lg">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill || `hsl(var(--chart-${(payload[0].dataIndex % 5) + 1}))` }} />
                                    <p className="font-semibold text-base">{data.shop_name}</p>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <p>Revenue: {formatCurrency(data.revenue)}</p>
                                    <p>Share: {percentage}% of total</p>
                                
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Pie
                          data={shopRevenueData}
                          dataKey="revenue"
                          nameKey="shop_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ shop_name, revenue }) => shop_name}
                          labelLine={true}
                        >
                          {shopRevenueData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                  </div>
                  
                  <div className="w-full sm:w-1/2">
                    <div className="h-[250px] overflow-y-auto">
                      <table className="min-w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2">Shop</th>
                            <th className="text-right p-2">Revenue</th>
                            <th className="text-right p-2">Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shopRevenueData.map((shop, index) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">{shop.shop_name}</td>
                              <td className="text-right p-2">{formatCurrency(shop.revenue)}</td>
                              <td className="text-right p-2">{Math.round((shop.revenue / totalRevenue) * 100)}%</td>
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
              {shopRevenueData.length > 0 && (
                <>
                  <div className="flex gap-2 font-medium leading-none">
                    <Store className="h-4 w-4 text-green-500" />
                    Top performing shop: {topShop.name} ({formatCurrency(topShop.revenue)})
                  </div>
                  <div className="leading-none text-muted-foreground hidden sm:block">
                    {shopRevenueData.length > 1 && (
                      <>
                        Revenue difference between top and bottom shop: 
                        {formatCurrency(topShop.revenue - shopRevenueData[shopRevenueData.length - 1].revenue)}
                        ({Math.round((topShop.revenue / shopRevenueData[shopRevenueData.length - 1].revenue) * 100 - 100)}% higher)
                      </>
                    )}
                  </div>
                </>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ShopAnalytics;
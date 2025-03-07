// src/components/analytics/CustomerDemographics.jsx
import React, { useState, useEffect } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts";
import { supabase } from "../../supabase";
import { PawPrint, Users, RefreshCw } from "lucide-react";
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

const CustomerDemographics = ({ dateRange }) => {
  const [breedData, setBreedData] = useState([]);
  const [customerTypeData, setCustomerTypeData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalDogs, setTotalDogs] = useState(0);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchCustomerData();
    }
  }, [dateRange]);

  const fetchCustomerData = async () => {
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
      
      const { data: bookingsData, error: bookingsError } = await query;

      if (bookingsError) throw bookingsError;

      // Process dog breed data
      const breedCounts = processBreedData(bookingsData);
      setBreedData(breedCounts);
      setTotalDogs(bookingsData.length);

      // Process customer data (new vs repeat)
      const customerTypes = processCustomerTypeData(bookingsData);
      setCustomerTypeData(customerTypes);
      setTotalCustomers(
        customerTypes.reduce((acc, type) => acc + type.value, 0)
      );
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processBreedData = (data) => {
    if (!data || data.length === 0) return [];

    // Count breeds
    const breedCount = {};
    data.forEach((booking) => {
      try {
        const breed = booking.dog_breed ? booking.dog_breed.trim() : "Unknown";
        if (breed) {
          breedCount[breed] = (breedCount[breed] || 0) + 1;
        }
      } catch (error) {
        console.error("Error processing breed data:", error, booking);
      }
    });

    // Convert to array for chart
    let breedArray = Object.entries(breedCount).map(([name, count]) => ({
      name,
      value: count,
    }));

    // Sort by count (descending)
    breedArray.sort((a, b) => b.value - a.value);

    // Get top 5 breeds, group others
    if (breedArray.length > 5) {
      const top5 = breedArray.slice(0, 5);
      const others = breedArray.slice(5);
      const othersCount = others.reduce((sum, breed) => sum + breed.value, 0);

      if (othersCount > 0) {
        top5.push({
          name: "Other Breeds",
          value: othersCount,
        });
      }

      breedArray = top5;
    }

    return breedArray;
  };

  const processCustomerTypeData = (data) => {
    if (!data || data.length === 0) return [];

    // Count unique customers
    const customerCount = {};
    data.forEach((booking) => {
      try {
        const customerName = booking.customer_name
          ? booking.customer_name.trim()
          : "";
        const contactNumber = booking.contact_number
          ? booking.contact_number.trim()
          : "";

        // Create a unique identifier combining name and number
        const customerKey = `${customerName}-${contactNumber}`;

        if (customerKey !== "-") {
          if (!customerCount[customerKey]) {
            customerCount[customerKey] = 1;
          } else {
            customerCount[customerKey]++;
          }
        }
      } catch (error) {
        console.error("Error processing customer data:", error, booking);
      }
    });

    // Count new vs returning customers
    let newCustomers = 0;
    let returningCustomers = 0;

    Object.values(customerCount).forEach((count) => {
      if (count === 1) {
        newCustomers++;
      } else {
        returningCustomers++;
      }
    });

    return [
      { name: "New Customers", value: newCustomers },
      { name: "Returning Customers", value: returningCustomers },
    ];
  };

  // Chart configurations
  const breedChartConfig = {
    breed1: {
      label: breedData[0]?.name || "Breed 1",
      color: "hsl(var(--chart-1))",
    },
    breed2: {
      label: breedData[1]?.name || "Breed 2",
      color: "hsl(var(--chart-2))",
    },
    breed3: {
      label: breedData[2]?.name || "Breed 3",
      color: "hsl(var(--chart-3))",
    },
    breed4: {
      label: breedData[3]?.name || "Breed 4",
      color: "hsl(var(--chart-4))",
    },
    breed5: {
      label: breedData[4]?.name || "Breed 5",
      color: "hsl(var(--chart-5))",
    },
    otherBreeds: {
      label: "Other Breeds",
      color: "hsl(var(--muted-foreground))",
    },
  };

  const customerTypeChartConfig = {
    new: {
      label: "New Customers",
      color: "hsl(var(--chart-1))",
    },
    returning: {
      label: "Returning Customers",
      color: "hsl(var(--chart-3))",
    },
  };

  // Create dynamic COLORS array based on chart data
  const BREED_COLORS = [
    "var(--color-breed1)",
    "var(--color-breed2)",
    "var(--color-breed3)",
    "var(--color-breed4)",
    "var(--color-breed5)",
    "var(--color-otherBreeds)",
  ];

  const CUSTOMER_COLORS = ["var(--color-new)", "var(--color-returning)"];

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
            <CardTitle>Customer Demographics</CardTitle>
            <CardDescription>
              Customer and pet insights for your business
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-right">
          <div className="bg-primary/10 px-3 py-1 rounded-full text-sm inline-block">
            {formatDateRangeDisplay()}
          </div>
        </div>
        
        <Tabs defaultValue="breeds">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="breeds" className="flex items-center gap-2">
              <PawPrint className="h-4 w-4" />
              Dog Breeds
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customer Types
            </TabsTrigger>
          </TabsList>

          <TabsContent value="breeds" className="pt-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : breedData.length === 0 ? (
              <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">No breed data available</p>
                  <p className="text-sm text-muted-foreground">
                    Complete some bookings to see breed analytics
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">Most Common Breeds</h3>
                    <p className="text-sm text-muted-foreground">
                      Top {Math.min(5, breedData.length)} dog breeds
                    </p>
                  </div>
                  <div className="bg-primary/10 px-3 py-1 rounded-full text-sm">
                    {totalDogs} dogs groomed
                  </div>
                </div>

                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/2">
                    <ChartContainer
                      config={breedChartConfig}
                      className="h-64 mx-auto"
                    >
                      <PieChart>
                        <Pie
                          data={breedData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={2}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {breedData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={BREED_COLORS[index % BREED_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => `${value} dogs`}
                            />
                          }
                        />
                      </PieChart>
                    </ChartContainer>
                  </div>

                  <div className="md:w-1/2 mt-4 md:mt-0">
                    <div className="space-y-3">
                      {breedData.map((breed, index) => (
                        <div key={breed.name} className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{
                              backgroundColor:
                                BREED_COLORS[index % BREED_COLORS.length],
                            }}
                          ></div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">
                                {breed.name}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {breed.value} dogs
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${
                                    (breed.value / totalDogs) * 100
                                  }%`,
                                  backgroundColor:
                                    BREED_COLORS[index % BREED_COLORS.length],
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="customers" className="pt-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : customerTypeData.length === 0 ? (
              <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">
                    No customer data available
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complete some bookings to see customer analytics
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">Customer Loyalty</h3>
                    <p className="text-sm text-muted-foreground">
                      New vs. returning customers
                    </p>
                  </div>
                  <div className="bg-primary/10 px-3 py-1 rounded-full text-sm">
                    {totalCustomers} unique customers
                  </div>
                </div>

                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/2">
                    <ChartContainer
                      config={customerTypeChartConfig}
                      className="h-64 mx-auto"
                    >
                      <PieChart>
                        <Pie
                          data={customerTypeData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {customerTypeData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                CUSTOMER_COLORS[index % CUSTOMER_COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => `${value} customers`}
                            />
                          }
                        />
                      </PieChart>
                    </ChartContainer>
                  </div>

                  <div className="md:w-1/2 mt-4 md:mt-0">
                    <div className="space-y-4">
                      {customerTypeData.map((type, index) => (
                        <div
                          key={type.name}
                          className="p-4 rounded-md border"
                          style={{
                            borderColor:
                              CUSTOMER_COLORS[index % CUSTOMER_COLORS.length],
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  CUSTOMER_COLORS[index % CUSTOMER_COLORS.length],
                              }}
                            ></div>
                            <span className="font-medium">{type.name}</span>
                          </div>
                          <div className="text-2xl font-bold">{type.value}</div>
                          <div className="text-sm text-muted-foreground">
                            {((type.value / totalCustomers) * 100).toFixed(1)}% of
                            total
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Based on data from {formatDateRangeDisplay()}
        </div>
        <button
          onClick={fetchCustomerData}
          className="flex items-center gap-1 text-sm text-primary"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </CardFooter>
    </Card>
  );
};

export default CustomerDemographics;
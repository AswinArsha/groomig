// src/components/Analytics/DogAnalytics.jsx
import React, { useState, useEffect } from "react";
import { 
  PawPrint,
  ListFilter,
  Info
} from "lucide-react";
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  XAxis,
  YAxis,
  LabelList,
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { supabase } from "../../supabase"; // Adjust path as needed

function DogAnalytics({ dateRange }) {
  const [dogBreedsData, setDogBreedsData] = useState([]);
  const [topBreed, setTopBreed] = useState({ breed: '', count: 0 });
  const [totalDogs, setTotalDogs] = useState(0);
  const [uniqueBreeds, setUniqueBreeds] = useState(0);
  const [sortBy, setSortBy] = useState("count");
  const [isLoading, setIsLoading] = useState(true);

  // Chart configurations
  const breedConfig = {
    count: {
      label: "Number of Dogs",
      color: "hsl(var(--chart-5))",
    }
  };

  useEffect(() => {
    fetchDogBreedsData();
  }, [dateRange]);

  const fetchDogBreedsData = async () => {
    setIsLoading(true);
    try {
      const from = dateRange?.from ? dateRange.from.toISOString().split('T')[0] : '2010-01-01';
      const to = dateRange?.to ? dateRange.to.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Fetch dog breeds data
      const { data, error } = await supabase
        .from('historical_bookings')
        .select('dog_breed, dog_name')
        .gte('booking_date', from)
        .lte('booking_date', to);
        
      if (error) throw error;
      
      // Process breeds data
      const breedsCount = {};
      const dogNames = new Set();
      
      data.forEach(booking => {
        if (booking.dog_breed) {
          // Normalize breed name (trim whitespace, capitalize first letter)
          const breedName = booking.dog_breed.trim();
          
          if (!breedsCount[breedName]) {
            breedsCount[breedName] = 0;
          }
          
          breedsCount[breedName]++;
        }
        
        if (booking.dog_name) {
          dogNames.add(booking.dog_name.trim());
        }
      });
      
      // Convert to array for chart
      const chartData = Object.keys(breedsCount).map(breed => ({
        breed: breed,
        count: breedsCount[breed]
      }));
      
      // Sort by count (descending) as default
      chartData.sort((a, b) => b.count - a.count);
      
      // Set the most common breed
      if (chartData.length > 0) {
        setTopBreed({
          breed: chartData[0].breed,
          count: chartData[0].count
        });
      }
      
      setDogBreedsData(chartData);
      setTotalDogs(dogNames.size);
      setUniqueBreeds(chartData.length);
      
    } catch (error) {
      console.error('Error fetching dog breeds data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    
    const sortedData = [...dogBreedsData];
    
    if (value === "count") {
      sortedData.sort((a, b) => b.count - a.count);
    } else if (value === "alphabetical") {
      sortedData.sort((a, b) => a.breed.localeCompare(b.breed));
    }
    
    setDogBreedsData(sortedData);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Dog/Pet Analytics</h2>
        <div className="p-8 text-center">Loading dog analytics data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Dog/Pet Analytics</h2>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PawPrint className="h-5 w-5" />
                Most Common Dog Breeds
              </CardTitle>
              <CardDescription>Breed popularity by number of bookings</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Popularity</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dogBreedsData.length > 0 ? (
            <ChartContainer config={breedConfig} className="h-[400px]">
              <BarChart
                accessibilityLayer
                data={dogBreedsData.slice(0, 10)} // Show top 10 breeds
                layout="vertical"
                margin={{ left: 120, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid horizontal strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="breed" 
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  content={(props) => {
                    const { active, payload } = props;
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card p-3 border shadow-lg rounded-lg">
                          <p className="font-semibold text-card-foreground mb-1">{data.breed}</p>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <PawPrint className="h-4 w-4" />
                            <span className="font-medium text-card-foreground">
                              {data.count} dogs
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {Math.round((data.count / dogBreedsData.reduce((sum, item) => sum + item.count, 0)) * 100)}% of all dogs
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--chart-5))" 
                  radius={[0, 4, 4, 0]} 
                >
                  <LabelList dataKey="count" position="right" />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No dog breed data available for the selected period
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
              <span className="text-muted-foreground text-xs">Most Popular Breed</span>
              <span className="text-lg font-semibold">{topBreed.breed || 'N/A'}</span>
              <span className="text-sm text-muted-foreground">{topBreed.count} bookings</span>
            </div>
            
            <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
              <span className="text-muted-foreground text-xs">Unique Breeds</span>
              <span className="text-lg font-semibold">{uniqueBreeds}</span>
              <span className="text-sm text-muted-foreground">different breeds</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2 mt-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              {dogBreedsData.length > 10 ? 
                `Showing top 10 of ${dogBreedsData.length} dog breeds. ${Math.round((dogBreedsData.slice(0, 10).reduce((sum, item) => sum + item.count, 0) / dogBreedsData.reduce((sum, item) => sum + item.count, 0)) * 100)}% of all dogs belong to these top 10 breeds.` : 
                `Showing all ${dogBreedsData.length} dog breeds in the selected time period.`}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default DogAnalytics;
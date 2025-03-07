import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, X, Download, Check, RotateCcw } from "lucide-react";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardTitle,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CalendarDatePicker from "@/components/ui/CalendarDatePicker";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 10;

export default function HistoricalBookingTable() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [serviceOptions, setServiceOptions] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectValue, setSelectValue] = useState("");
  const [shopOptions, setShopOptions] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const navigate = useNavigate();

  // Fetch available services
  const fetchServiceOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name")
        .order('name');
      
      if (error) throw error;
      
      const options = data.map(service => ({
        value: service.id,
        label: service.name
      }));
      setServiceOptions(options);
    } catch (error) {
      toast.error(`Error fetching services: ${error.message}`);
    }
  }, []);

  // Fetch available shops for filtering
  const fetchShopOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .order("name");
      if (error) throw error;
      const options = [{ value: null, label: "All Shops" }].concat(
        data.map(shop => ({
          value: shop.id,
          label: shop.name,
        }))
      );
      setShopOptions(options);
    } catch (error) {
      toast.error(`Error fetching shops: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    fetchServiceOptions();
    fetchShopOptions();
  }, [fetchServiceOptions, fetchShopOptions]);

  const handleServiceSelect = (serviceId) => {
    const selectedService = serviceOptions.find(service => service.value === serviceId);
    if (selectedService) {
      setSelectedServices(prev => {
        // If service is already selected, remove it
        if (prev.some(s => s.value === serviceId)) {
          return prev.filter(s => s.value !== serviceId);
        }
        // If service is not selected, add it
        return [...prev, selectedService];
      });
      setSelectValue(""); // Reset select value after selection
    }
  };

  const removeService = (serviceId) => {
    setSelectedServices(selectedServices.filter(service => service.value !== serviceId));
  };

  const clearAllFilters = () => {
    setSelectedServices([]);
    setSelectValue("");
    setSearchTerm("");
    setSelectedShop(null);
    setSelectedStatus(null);
    setSelectedDate({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    });
  };

  const clearAllServices = () => {
    setSelectedServices([]);
    setSelectValue("");
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    
    // Add title and filters info
    doc.setFontSize(16);
    doc.text('Historical Bookings Report', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Date Range: ${format(selectedDate.from, "MMM dd, yyyy")} - ${format(selectedDate.to, "MMM dd, yyyy")}`, 14, 25);
    
    let yPosition = 32;
    
    if (selectedServices.length > 0) {
      const servicesText = `Services: ${selectedServices.map(s => s.label).join(', ')}`;
      doc.text(servicesText, 14, yPosition);
      yPosition += 7;
    }
    
    if (searchTerm) {
      doc.text(`Search Term: ${searchTerm}`, 14, yPosition);
      yPosition += 7;
    }

    if (selectedStatus) {
      doc.text(`Status: ${selectedStatus}`, 14, yPosition);
      yPosition += 7;
    }

    if (selectedShop) {
      const shopName = shopOptions.find(shop => shop.value === selectedShop)?.label || "Unknown Shop";
      doc.text(`Shop: ${shopName}`, 14, yPosition);
      yPosition += 7;
    }

    // Define the table columns
    const columns = [
      'No.',
      'Customer',
      'Contact',
      'Dog',
      'Breed',
      'Date',
      'Completed On',
      'Status'
    ];

    // Prepare the data
    const data = bookings.map((booking, index) => [
      (currentPage - 1) * ITEMS_PER_PAGE + index + 1,
      booking.customer_name,
      booking.contact_number,
      booking.dog_name,
      booking.dog_breed,
      format(new Date(booking.booking_date), "MMM dd, yyyy"),
      booking.completed_at ? format(new Date(booking.completed_at), "MMM dd, yyyy") : "N/A",
      booking.status.replace("_", " ").toUpperCase()
    ]);

    // Add the table
    doc.autoTable({
      head: [columns],
      body: data,
      startY: yPosition,
      headStyles: { fillColor: [51, 51, 51] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 15 },
        7: { cellWidth: 25 }
      }
    });

    // Save the PDF
    doc.save('historical-bookings-report.pdf');
  };

  const fetchHistoricalBookings = useCallback(async () => {
    setLoading(true);
    try {
      const formattedDateFrom = format(selectedDate.from, "yyyy-MM-dd");
      const formattedDateTo = format(selectedDate.to, "yyyy-MM-dd");

      // Build the query for historical_bookings
      let query = supabase
        .from("historical_bookings")
        .select("*", { count: "exact" })
        .gte("booking_date", formattedDateFrom)
        .lte("booking_date", formattedDateTo)
        .order("completed_at", { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      // Add search term filter if provided
      if (searchTerm) {
        query = query.or(
          `customer_name.ilike.%${searchTerm}%,dog_breed.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,dog_name.ilike.%${searchTerm}%`
        );
      }

      // Add shop filter if selected
      if (selectedShop) {
        query = query.eq("shop_id", selectedShop);
      }

      // Add status filter if selected
      if (selectedStatus) {
        query = query.eq("status", selectedStatus.toLowerCase());
      }

      // Add service filter if selected
      if (selectedServices.length > 0) {
        // First, execute the query without service filters to get all matching records
        const { data: initialData, error: initialError, count: initialCount } = await query;
        
        if (initialError) throw initialError;
        
        // Then filter these records on the client side for services
        // This approach avoids the complex JSONB query that was causing the error
        let filteredData = initialData || [];
        
        // Filter the records that have at least one of the selected services
        if (selectedServices.length > 0) {
          filteredData = filteredData.filter(booking => {
            if (!booking.services || !Array.isArray(JSON.parse(booking.services))) return false;
            
            const bookingServices = JSON.parse(booking.services);
            return selectedServices.some(selectedService => 
              bookingServices.some(bookingService => bookingService.id === selectedService.value)
            );
          });
        }
        
        setBookings(filteredData);
        // For pagination, we're now using client-side data, so adjust count accordingly
        setTotalCount(filteredData.length);
        setTotalPages(Math.ceil(filteredData.length / ITEMS_PER_PAGE));
        setLoading(false);
        return; // Skip the rest of the method since we've handled everything
      }

      // If no service filters, execute the query normally
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setBookings(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      toast.error(`Error fetching historical bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, searchTerm, currentPage, selectedServices, selectedShop, selectedStatus]);

  useEffect(() => {
    setCurrentPage(1);
    fetchHistoricalBookings();
  }, [searchTerm, selectedDate, selectedServices, selectedShop, selectedStatus]);

  useEffect(() => {
    fetchHistoricalBookings();
  }, [currentPage]);

  // Format time
  const formatTimeIST = (timeStr) => {
    if (!timeStr) return "N/A";
    try {
      return format(parse(timeStr, "HH:mm:ss", new Date()), "hh:mm a");
    } catch (error) {
      return "N/A";
    }
  };

  return (
    <div className="container">
      {/* Controls */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col gap-4">
          {/* Top Row: Back Button & Search */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => navigate("/home")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>

            {/* Search Input */}
            <div className="flex gap-2 w-full sm:w-80 md:flex-1">
              <Input
                type="text"
                placeholder="Search historical bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
                  {/* Clear All Filters Button */}
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Clear All Filters</span>
            </Button>
            </div>

            {/* Download PDF Button */}
            <Button
              variant="outline"
              onClick={downloadPDF}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </Button>
          </div>

          {/* Filter Row: Shop, Services, Date */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Shop Filter */}
            <div className="w-full sm:w-52">
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by shop..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {shopOptions.map((shop) => (
                      <SelectItem key={shop.value || "all"} value={shop.value}>
                        {shop.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-52">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={null}>All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Service Filter */}
            <div className="w-full sm:w-52">
              <Select value={selectValue} onValueChange={handleServiceSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by services..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {serviceOptions.map((service) => (
                      <SelectItem 
                        key={service.value} 
                        value={service.value}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span>{service.label}</span>
                          {selectedServices.some(s => s.value === service.value) && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="w-full sm:w-52">
              <CalendarDatePicker date={selectedDate} onDateSelect={setSelectedDate} />
            </div>

        
          </div>

          {/* Selected Services Display */}
          {selectedServices.length > 0 && (
            <div className="flex flex-wrap gap-3 items-center mt-2">
              {selectedServices.map((service) => (
                <Badge
                  key={service.value}
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {service.label}
                  <button
                    className="ml-1 text-gray-500 hover:text-red-500 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                    onClick={() => removeService(service.value)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllServices}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Clear services
              </Button>
            </div>
          )}
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Historical Bookings</CardTitle>
            <CardDescription>
              Viewing {selectedStatus ? selectedStatus.toLowerCase() : "all"} bookings from {format(selectedDate.from, "PPP")} to{" "}
              {format(selectedDate.to, "PPP")}
              {selectedShop && shopOptions.find(shop => shop.value === selectedShop) && 
                ` for ${shopOptions.find(shop => shop.value === selectedShop).label}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No historical bookings found matching your criteria.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Dog</TableHead>
                      <TableHead>Breed</TableHead>
                      <TableHead>Booking Date</TableHead>
                      <TableHead>Completed On</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking, index) => (
                      <TableRow key={booking.id}>
                        <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell>{booking.customer_name}</TableCell>
                        <TableCell>{booking.contact_number}</TableCell>
                        <TableCell>{booking.dog_name}</TableCell>
                        <TableCell>{booking.dog_breed}</TableCell>
                        <TableCell>
                          {format(new Date(booking.booking_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {booking.completed_at ? format(new Date(booking.completed_at), "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={booking.status === "completed" ? "success" : "destructive"}
                            className={`${
                              booking.status === "completed" 
                                ? "bg-green-200 text-green-700 border border-green-300 " 
                                : "bg-red-200 text-red-700 border border-red-300 "
                            }`}
                          >
                            {booking.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {booking.feedback && booking.feedback.rating ? (
                            <span className="flex items-center">
                              {booking.feedback.rating}
                              <svg className="w-4 h-4 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                              </svg>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      if (!booking?.id) {
        toast.error("Invalid booking ID");
        return;
      }
      // Ensure the ID is a valid UUID before navigation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(booking.id)) {
        toast.error("Invalid booking ID format");
        return;
      }
      navigate(`/all-booking-details/${booking.id}`);
    }}
  >
    <ArrowRight className="h-4 w-4" />
  </Button>
</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {totalCount > ITEMS_PER_PAGE && !loading && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
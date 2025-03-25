import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, X, Download, Check, RotateCcw, ArrowUpDown } from "lucide-react";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  CardFooter,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
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
  const [selectedPaymentMode, setSelectedPaymentMode] = useState(null);
  const [ratingSort, setRatingSort] = useState(null); // null, 'asc', or 'desc'
  const navigate = useNavigate();

  // Fetch available services
  const fetchServiceOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name")
        .order("name");
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
        // Toggle service selection
        if (prev.some(s => s.value === serviceId)) {
          return prev.filter(s => s.value !== serviceId);
        }
        return [...prev, selectedService];
      });
      setSelectValue("");
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
    setSelectedPaymentMode(null);
    setRatingSort(null);
    setSelectedDate({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    });
  };

  const clearAllServices = () => {
    setSelectedServices([]);
    setSelectValue("");
  };

  const toggleRatingSort = () => {
    if (ratingSort === null) {
      setRatingSort("desc"); // highest first
    } else if (ratingSort === "desc") {
      setRatingSort("asc"); // lowest first
    } else {
      setRatingSort(null);
    }
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Historical Bookings Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Date Range: ${format(selectedDate.from, "MMM dd, yyyy")} - ${format(selectedDate.to, "MMM dd, yyyy")}`, 14, 25);
    let yPosition = 32;
    if (selectedServices.length > 0) {
      const servicesText = `Services: ${selectedServices.map(s => s.label).join(", ")}`;
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
    if (selectedPaymentMode) {
      doc.text(`Payment Mode: ${selectedPaymentMode.toUpperCase()}`, 14, yPosition);
      yPosition += 7;
    }
    const columns = [
      "No.",
      "Customer",
      "Contact",
      "Dog",
      "Breed",
      "Date",
      "Completed On",
      "Status",
      "Rating",
      "Payment Mode",
      "Total Bill",
    ];
    const data = bookings.map((booking, index) => [
      (currentPage - 1) * ITEMS_PER_PAGE + index + 1,
      booking.customer_name,
      booking.contact_number,
      booking.dog_name,
      booking.dog_breed,
      format(new Date(booking.booking_date), "MMM dd, yyyy"),
      booking.completed_at ? format(new Date(booking.completed_at), "MMM dd, yyyy") : "N/A",
      booking.status.replace("_", " ").toUpperCase(),
      booking.feedback && booking.feedback.rating ? booking.feedback.rating : "N/A",
      booking.payment_mode ? booking.payment_mode.toUpperCase() : "N/A",
      booking.services
        ? booking.services.reduce((total, service) => total + (service.price || 0), 0).toFixed(2)
        : "N/A",
    ]);
    doc.autoTable({
      head: [columns],
      body: data,
      startY: yPosition,
      headStyles: { fillColor: [51, 51, 51] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 15 },
        7: { cellWidth: 20 },
        9: { cellWidth: 25 },
      },
    });
    doc.save("historical-bookings-report.pdf");
  };

  const fetchHistoricalBookings = useCallback(async () => {
    setLoading(true);
    try {
      const formattedDateFrom = format(selectedDate.from, "yyyy-MM-dd");
      const formattedDateTo = format(selectedDate.to, "yyyy-MM-dd");
      let query = supabase
        .from("historical_bookings")
        .select("*", { count: "exact" })
        .gte("booking_date", formattedDateFrom)
        .lte("booking_date", formattedDateTo)
        .order("completed_at", { ascending: false });
      if (searchTerm) {
        query = query.or(
          `customer_name.ilike.%${searchTerm}%,dog_breed.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,dog_name.ilike.%${searchTerm}%`
        );
      }
      if (selectedShop) {
        query = query.eq("shop_id", selectedShop);
      }
      if (selectedStatus) {
        query = query.eq("status", selectedStatus.toLowerCase());
      }
      if (selectedPaymentMode) {
        query = query.eq("payment_mode", selectedPaymentMode);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      let filteredData = data || [];
      if (selectedServices.length > 0) {
        filteredData = filteredData.filter((booking) => {
          if (!booking.services) return false;
          let bookingServices;
          try {
            bookingServices =
              typeof booking.services === "string"
                ? JSON.parse(booking.services)
                : booking.services;
            if (!Array.isArray(bookingServices)) {
              bookingServices = [bookingServices];
            }
            return selectedServices.some((selectedService) =>
              bookingServices.some(
                (bookingService) => bookingService.id === selectedService.value
              )
            );
          } catch (e) {
            console.warn("Error parsing services for booking:", booking.id);
            return false;
          }
        });
      }
      if (ratingSort) {
        filteredData = [...filteredData].sort((a, b) => {
          const ratingA = a.feedback && a.feedback.rating ? a.feedback.rating : 0;
          const ratingB = b.feedback && b.feedback.rating ? b.feedback.rating : 0;
          return ratingSort === "asc" ? ratingA - ratingB : ratingB - ratingA;
        });
      }
      const filteredCount = filteredData.length;
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      setBookings(filteredData.slice(start, end));
      setTotalCount(filteredCount);
      setTotalPages(Math.ceil(filteredCount / ITEMS_PER_PAGE));
    } catch (error) {
      toast.error(`Error fetching historical bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    selectedDate,
    searchTerm,
    currentPage,
    selectedServices,
    selectedShop,
    selectedStatus,
    selectedPaymentMode,
    ratingSort,
  ]);

  useEffect(() => {
    setCurrentPage(1);
    fetchHistoricalBookings();
  }, [
    searchTerm,
    selectedDate,
    selectedServices,
    selectedShop,
    selectedStatus,
    selectedPaymentMode,
    ratingSort,
    fetchHistoricalBookings,
  ]);

  useEffect(() => {
    fetchHistoricalBookings();
  }, [currentPage, fetchHistoricalBookings]);

  const formatTimeIST = (timeStr) => {
    if (!timeStr) return "N/A";
    try {
      return format(parse(timeStr, "HH:mm:ss", new Date()), "hh:mm a");
    } catch (error) {
      return "N/A";
    }
  };

  // Updated helper to get sub-slot display using the slot_description column
  const getSubSlotDisplay = (booking) => {
    return booking.slot_description || "N/A";
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => (
        <PaginationItem key={i + 1}>
          <Button
            variant={currentPage === i + 1 ? "outline" : "ghost"}
            className="h-9 w-9"
            onClick={() => setCurrentPage(i + 1)}
          >
            {i + 1}
          </Button>
        </PaginationItem>
      ));
    }
    const items = [];
    items.push(
      <PaginationItem key={1}>
        <Button
          variant={currentPage === 1 ? "outline" : "ghost"}
          className="h-9 w-9"
          onClick={() => setCurrentPage(1)}
        >
          1
        </Button>
      </PaginationItem>
    );
    let startPage = Math.max(2, currentPage - 2);
    let endPage = Math.min(totalPages - 1, currentPage + 2);
    if (startPage > 2) {
      items.push(
        <PaginationItem key="ellipsis-1">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <Button
            variant={currentPage === i ? "outline" : "ghost"}
            className="h-9 w-9"
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </Button>
        </PaginationItem>
      );
    }
    if (endPage < totalPages - 1) {
      items.push(
        <PaginationItem key="ellipsis-2">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <Button
            variant={currentPage === totalPages ? "outline" : "ghost"}
            className="h-9 w-9"
            onClick={() => setCurrentPage(totalPages)}
          >
            {totalPages}
          </Button>
        </PaginationItem>
      );
    }
    return items;
  };

  return (
    <div className="container mx-auto p-4">
      {/* Controls */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col gap-4 flex-wrap sm:flex-row sm:items-center sm:space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate("/home")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div className="flex gap-2 w-full sm:w-80 md:flex-1">
            <Input
              type="text"
              placeholder="Search historical bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              aria-label="Search Bookings"
            />
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Clear All Filters</span>
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={downloadPDF}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </Button>
        </div>

        {/* Filter Rows */}
        <div className="flex flex-wrap items-center gap-4">
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
          <div className="w-full sm:w-52">
            <Select value={selectedPaymentMode} onValueChange={setSelectedPaymentMode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by payment..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={null}>All Payment Modes</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="swipe">Card/Swipe</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-52">
            <CalendarDatePicker date={selectedDate} onDateSelect={setSelectedDate} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-52">
            <Select value={selectValue} onValueChange={(val) => handleServiceSelect(val)}>
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
                        {selectedServices.some((s) => s.value === service.value) && (
                          <Check className="h-4 w-4 ml-2 text-primary" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={ratingSort ? "secondary" : "outline"}
            onClick={toggleRatingSort}
            className="flex items-center space-x-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>
              {ratingSort === null && "Sort by Rating"}
              {ratingSort === "desc" && "Rating: High to Low"}
              {ratingSort === "asc" && "Rating: Low to High"}
            </span>
          </Button>
        </div>

        {selectedServices.length > 0 && (
          <div className="flex flex-wrap gap-2 my-2">
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
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Card className="mt-4 bg-white">
        <CardHeader>
          <CardTitle>Historical Bookings</CardTitle>
          <CardDescription>
            Viewing {selectedStatus ? selectedStatus.toLowerCase() : "all"} bookings from{" "}
            {format(selectedDate.from, "PPP")} to {format(selectedDate.to, "PPP")}
            {selectedShop && shopOptions.find((shop) => shop.value === selectedShop) &&
              ` for ${shopOptions.find((shop) => shop.value === selectedShop).label}`}
            {selectedPaymentMode &&
              ` with ${selectedPaymentMode.toUpperCase()} payment`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No historical bookings found matching your criteria.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-gray-200 text-gray-800">No.</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Customer</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Contact</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Dog</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Breed</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Date</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Time Slot</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Sub Slot</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Status</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Total Bill</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Payment Mode</TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-gray-50">
                    {bookings.map((booking, index) => (
                      <TableRow
                        key={booking.id}
                        className="cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          if (!booking?.id) {
                            toast.error("Invalid booking ID");
                            return;
                          }
                          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                          if (!uuidRegex.test(booking.id)) {
                            toast.error("Invalid booking ID format");
                            return;
                          }
                          navigate(`/all-booking-details/${booking.id}`);
                        }}
                      >
                        <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell>{booking.customer_name}</TableCell>
                        <TableCell>{booking.contact_number}</TableCell>
                        <TableCell>{booking.dog_name}</TableCell>
                        <TableCell>{booking.dog_breed}</TableCell>
                        <TableCell>{format(new Date(booking.booking_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{booking.slot_time ? formatTimeIST(booking.slot_time) : "N/A"}</TableCell>
                        <TableCell>{getSubSlotDisplay(booking)}</TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full font-medium p-1 text-xs ${
                              booking.status === "reserved"
                                ? "bg-yellow-200 text-yellow-700 border border-yellow-300"
                                : booking.status === "checked_in"
                                ? "bg-green-200 text-green-700 border border-green-300"
                                : booking.status === "progressing"
                                ? "bg-blue-200 text-blue-700 border border-blue-300"
                                : booking.status === "completed"
                                ? "bg-green-200 text-green-700 border border-green-300"
                                : booking.status === "canceled" || booking.status === "cancelled"
                                ? "bg-red-200 text-red-700 border border-red-300"
                                : "bg-gray-200 text-gray-700 border border-gray-300"
                            }`}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {booking.status.replace("_", " ").toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className={`font-medium flex items-center gap-2 ${
                                  booking.payment_mode === "credit" ? "text-red-600" : ""
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                ₹
                                {booking.services
                                  ? booking.services.reduce(
                                      (total, service) => total + (service.price || 0),
                                      0
                                    ).toFixed(2)
                                  : "0.00"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-6">
                              <div className="space-y-6">
                                <div className="space-y-3">
                                  <div className="text-sm font-medium">Services</div>
                                  {booking.services && booking.services.length > 0 ? (
                                    booking.services.map((service, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm py-1">
                                        <span>{service.name}</span>
                                        <span>₹{service.price.toFixed(2)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No services selected</p>
                                  )}
                                </div>
                                {booking.services && booking.services.length > 0 && (
                                  <div className="pt-4 border-t">
                                    <div className="flex justify-between items-center font-semibold">
                                      <span>Total Amount</span>
                                      <span>
                                        ₹
                                        {booking.services.reduce(
                                          (total, service) => total + (service.price || 0),
                                          0
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          {booking.payment_mode && (
                            <span
                              className={`rounded-full font-medium p-1 text-xs ${
                                booking.payment_mode === "credit"
                                  ? "bg-red-200 text-red-700 border border-red-300"
                                  : "bg-blue-200 text-blue-700 border border-blue-300"
                              }`}
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {booking.payment_mode.toUpperCase()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!booking?.id) {
                                toast.error("Invalid booking ID");
                                return;
                              }
                              const uuidRegex =
                                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="bg-white">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{booking.customer_name}</CardTitle>
                          <CardDescription>{booking.contact_number}</CardDescription>
                        </div>
                        <span
                          className={`rounded-full font-medium p-1 text-xs ${
                            booking.status === "reserved"
                              ? "bg-yellow-200 text-yellow-700 border border-yellow-300"
                              : booking.status === "checked_in"
                              ? "bg-green-200 text-green-700 border border-green-300"
                              : booking.status === "progressing"
                              ? "bg-blue-200 text-blue-700 border border-blue-300"
                              : booking.status === "completed"
                              ? "bg-green-200 text-green-700 border border-green-300"
                              : booking.status === "canceled" || booking.status === "cancelled"
                              ? "bg-red-200 text-red-700 border border-red-300"
                              : "bg-gray-200 text-gray-700 border border-gray-300"
                          }`}
                        >
                          {booking.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Dog:</span>
                          <span className="font-medium">
                            {booking.dog_name} ({booking.dog_breed})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date:</span>
                          <span className="font-medium">
                            {format(new Date(booking.booking_date), "MMM dd, yyyy")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time:</span>
                          <span className="font-medium">
                            {booking.slot_time ? formatTimeIST(booking.slot_time) : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Sub Slot:</span>
                          <span className="font-medium">{getSubSlotDisplay(booking)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Total Bill:</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                className={`font-medium text-sm flex items-center gap-2 ${
                                  booking.payment_mode === "credit" ? "text-red-600" : ""
                                }`}
                              >
                                ₹
                                {booking.services
                                  ? booking.services.reduce(
                                      (total, service) => total + (service.price || 0),
                                      0
                                    ).toFixed(2)
                                  : "0.00"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-6">
                              <div className="space-y-6">
                                <div className="space-y-3">
                                  <div className="text-sm font-medium">Services</div>
                                  {booking.services && booking.services.length > 0 ? (
                                    booking.services.map((service, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm py-1">
                                        <span>{service.name}</span>
                                        <span>₹{service.price.toFixed(2)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No services selected</p>
                                  )}
                                </div>
                                {booking.services && booking.services.length > 0 && (
                                  <div className="pt-4 border-t">
                                    <div className="flex justify-between items-center font-semibold">
                                      <span>Total Amount</span>
                                      <span>
                                        ₹
                                        {booking.services.reduce(
                                          (total, service) => total + (service.price || 0),
                                          0
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {booking.payment_mode && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Payment Mode:</span>
                            <span
                              className={`rounded-full font-medium p-1 text-xs ${
                                booking.payment_mode === "credit"
                                  ? "bg-red-200 text-red-700 border border-red-300"
                                  : "bg-blue-200 text-blue-700 border border-blue-300"
                              }`}
                            >
                              {booking.payment_mode.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2 pt-2">
                      {booking.status !== "cancelled" &&
                        booking.status !== "canceled" &&
                        booking.status !== "completed" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open edit dialog (implement as needed)
                              }}
                              aria-label={`Edit booking ${booking.id}`}
                            >
                              {/* Implement Edit Icon as needed */}
                              <span>Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open cancel confirmation (implement as needed)
                              }}
                              aria-label={`Cancel booking ${booking.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      {booking.status === "reserved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle check-in action
                          }}
                          className="bg-green-500 text-white"
                          aria-label={`Check in booking ${booking.id}`}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      ) : (booking.status === "checked_in" ||
                          booking.status === "progressing" ||
                          booking.status === "completed") ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/all-booking-details/${booking.id}`);
                          }}
                          aria-label={`View details for booking ${booking.id}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </CardFooter>
                  </Card>
                ))}
              </div>
         
          </div>
             )}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          {totalPages > 1 && !loading && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

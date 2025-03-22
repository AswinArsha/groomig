
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { X, Edit2, Check, ArrowRight, Loader2, Ban, RotateCcw, Receipt } from "lucide-react";
import { format, parse } from "date-fns";
import toast from "react-hot-toast";
import BookingForm from "./BookingForm"; // Ensure correct import
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DatePickerDemo } from "@/components/ui/DatePickerDemo";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const ITEMS_PER_PAGE = 10;

export default function BookingTable() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  // Use a single date picker (default today)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // States for filtering by services:
  const [serviceOptions, setServiceOptions] = useState([]);
  const [selectedServiceFilters, setSelectedServiceFilters] = useState([]);
  const [selectValue, setSelectValue] = useState("");

  // States for filtering by shops
  const [shopOptions, setShopOptions] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);

  const navigate = useNavigate();

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
    fetchShopOptions();
  }, [fetchShopOptions]);

  // Helper to display sub-slot
  const getSubSlotDisplay = (booking) => {
    const sub = booking.sub_time_slots;
    if (sub) {
      return sub.description || (sub.slot_number ? `Slot ${sub.slot_number}` : "N/A");
    }
    return "N/A";
  };

  // Fetch available service options for filtering
  const fetchServiceOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name")
        .order("name");
      if (error) throw error;
      const options = data.map(service => ({
        value: service.id,
        label: service.name,
      }));
      setServiceOptions(options);
    } catch (error) {
      toast.error(`Error fetching services: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    fetchServiceOptions();
  }, [fetchServiceOptions]);

  // When a service is selected from the dropdown, add it to the filter list
  const handleServiceSelect = (serviceId) => {
    const selectedService = serviceOptions.find(s => s.value === serviceId);
    if (selectedService) {
      // If service is already selected, remove it
      if (selectedServiceFilters.some(s => s.value === serviceId)) {
        setSelectedServiceFilters(selectedServiceFilters.filter(s => s.value !== serviceId));
      } else {
        // If service is not selected, add it
        setSelectedServiceFilters([...selectedServiceFilters, selectedService]);
      }
      setSelectValue(""); // reset select value after selection
    }
  };

  const removeServiceFilter = (serviceId) => {
    setSelectedServiceFilters(selectedServiceFilters.filter(s => s.value !== serviceId));
  };

  const clearAllServiceFilters = () => {
    setSelectedServiceFilters([]);
    setSelectValue("");
  };

  // Fetch bookings with filters applied
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");

      let query = supabase
        .from("bookings")
        .select(`
          *,
          sub_time_slots (
            *,
            time_slots (
              start_time
            )
          ),
          booking_services_selected (*, services(*))
        `, { count: "exact" })
        .eq("booking_date", formattedDate)
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (searchTerm) {
        query = query.or(
          `customer_name.ilike.%${searchTerm}%,dog_breed.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,dog_name.ilike.%${searchTerm}%`
        );
      }

      // Add shop filter
      if (selectedShop) {
        query = query.eq("shop_id", selectedShop);
      }

      // If service filters are applied, filter bookings that have at least one matching service.
      if (selectedServiceFilters.length > 0) {
        const selectedServiceIds = selectedServiceFilters.map(service => service.value);
        const { data: bookingIds, error: serviceError } = await supabase
          .from("booking_services_selected")
          .select("booking_id")
          .in("service_id", selectedServiceIds);
        if (serviceError) throw serviceError;
        if (bookingIds && bookingIds.length > 0) {
          const uniqueBookingIds = [...new Set(bookingIds.map(item => item.booking_id))];
          query = query.in("id", uniqueBookingIds);
        } else {
          setBookings([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      }

      const { data: bookingsData, error: bookingsError, count } = await query;
      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);
      setTotalCount(count || 0);
    } catch (error) {
      toast.error(`Error fetching bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, searchTerm, currentPage, selectedServiceFilters, selectedShop]);

  useEffect(() => {
    // Reset to page 1 when search term, date, service filters, or shop filter changes
    setCurrentPage(1);
    fetchBookings();
  }, [searchTerm, selectedDate, selectedServiceFilters, selectedShop, fetchBookings]);

  useEffect(() => {
    fetchBookings();
  }, [currentPage, fetchBookings]);

  // Real-time subscription to bookings changes
  useEffect(() => {
    const channel = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('Change received!', payload);
          fetchBookings();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage, searchTerm, selectedDate, selectedServiceFilters, fetchBookings]);

  async function handleCancel(booking) {
    setLoading(true);
    try {
      // 1. Get shop name
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("name")
        .eq("id", booking.shop_id)
        .single();
      
      if (shopError) throw shopError;
      
      // 2. Get sub_time_slot description
      let slotDescription = "N/A";
      if (booking.sub_time_slot_id) {
        const { data: slotData, error: slotError } = await supabase
          .from("sub_time_slots")
          .select("description, slot_number")
          .eq("id", booking.sub_time_slot_id)
          .single();
        
        if (slotError) throw slotError;
        slotDescription = slotData.description || (slotData.slot_number ? `Slot ${slotData.slot_number}` : "N/A");
      }
      
      // 3. Get selected services
      const { data: servicesData, error: servicesError } = await supabase
        .from("booking_services_selected")
        .select("service_id, services(name, price)")
        .eq("booking_id", booking.id);
      
      if (servicesError) throw servicesError;
      
      // Format services as JSON
      const services = servicesData.map(item => ({
        id: item.service_id,
        name: item.services?.name || "Unknown",
        price: item.services?.price || 0
      }));
      
      // 4. Get feedback if any
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("booking_feedback")
        .select("*")
        .eq("booking_id", booking.id);
      
      // 5. Store in historical_bookings
      const { error: historyError } = await supabase
        .from("historical_bookings")
        .insert({
          original_booking_id: booking.id,
          customer_name: booking.customer_name,
          contact_number: booking.contact_number,
          dog_name: booking.dog_name,
          dog_breed: booking.dog_breed,
          booking_date: booking.booking_date,
          slot_time: booking.slot_time,
          sub_time_slot_id: booking.sub_time_slot_id,
          shop_id: booking.shop_id,
          status: "cancelled",  
          services: services.length > 0 ? JSON.stringify(services) : null,
          feedback: feedbackData && feedbackData.length > 0 ? JSON.stringify(feedbackData[0]) : null,
          shop_name: shopData?.name || null,
          slot_description: slotDescription
        });
      
      if (historyError) throw historyError;
      
      // 6. Update booking status to canceled
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", booking.id);
        
      if (updateError) throw updateError;
      
      toast.success("Booking canceled successfully!");
      fetchBookings();
    } catch (error) {
      toast.error(`Error canceling booking: ${error.message}`);
    } finally {
      setCancelId(null);
      setLoading(false);
    }
  }

  async function handleCheckIn(bookingId) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "checked_in",
          check_in_time: new Date().toISOString()
        })
        .eq("id", bookingId);
      if (error) throw error;
      toast.success("Booking checked in successfully!");
      fetchBookings();
    } catch (error) {
      toast.error(`Error checking in booking: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      if (startPage > 2) pages.push("...");
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (endPage < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const formatTimeIST = (timeStr) => {
    try {
      return format(parse(timeStr, "HH:mm:ss", new Date()), "hh:mm a");
    } catch (error) {
      return "N/A";
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex mb-2 flex-col sm:flex-row sm:items-center sm:space-x-4">
        <Input
          type="text"
          placeholder="Search by customer, breed, contact, dog name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64"
          aria-label="Search Bookings"
        />

        {/* Shop Filter Select */}
        <div className="sm:w-72">
          <Select value={selectedShop} onValueChange={setSelectedShop}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by shop..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {shopOptions.map((shop) => (
                  <SelectItem
                    key={shop.value || 'all'}
                    value={shop.value}
                  >
                    {shop.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Service Filter Select */}
        <div className="sm:w-72">
          <Select value={selectValue} onValueChange={(val) => { handleServiceSelect(val); }}>
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
                    <div className="flex">
                    <span>{service.label}</span>
                    {selectedServiceFilters.some(s => s.value === service.value) && (
                      <Check className="h-4 w-4 ml-2 text-primary" />
                    )}</div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <DatePickerDemo date={selectedDate} setDate={setSelectedDate} />
      </div>

       
         {/* Display selected service filters as badges */}
         {selectedServiceFilters.length > 0 && (
          <div className="my-2 flex flex-wrap gap-2">
            {selectedServiceFilters.map(service => (
              <Badge key={service.value} variant="secondary" className="flex items-center">
                {service.label}
                <button
                  onClick={() => removeServiceFilter(service.value)}
                  className="ml-1 text-sm"
                  aria-label={`Remove filter for ${service.label}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </Badge>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllServiceFilters}
              className="text-sm"
            >
                <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>
            Manage your dog grooming appointments for {format(selectedDate, "PPP")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading bookings" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No bookings found.</p>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-gray-200 text-gray-800"  >No.</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Customer</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Contact</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Dog</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Breed</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Date</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Time Slot</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Sub Slot</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Status</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Total Bill</TableHead>
                    <TableHead className="bg-gray-200 text-gray-800">Actions</TableHead>
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
                      <TableCell>{format(new Date(booking.booking_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {booking.slot_time ? formatTimeIST(booking.slot_time) : "N/A"}
                      </TableCell>
                  
                      <TableCell>{getSubSlotDisplay(booking)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${booking.status === "reserved"
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
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="font-medium flex items-center gap-2">
                            
                              ₹{booking.booking_services_selected?.reduce((total, service) => 
                                total + (service.services?.price || 0), 0).toFixed(2) || '0.00'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-6">
                            <div className="space-y-6">
                        
                    
                              <div className="space-y-3">
                                <div className="text-sm font-medium">Services</div>
                                {booking.booking_services_selected?.map((service, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm py-1 ">
                                    <span>{service.services?.name}</span>
                                    <span>₹{service.services?.price.toFixed(2)}</span>
                                  </div>
                                )) || <p className="text-sm text-muted-foreground">No services selected</p>}
                              </div>
                              {booking.booking_services_selected?.length > 0 && (
                                <div className="pt-4 border-t">
                                  <div className="flex justify-between items-center font-semibold">
                                    <span>Total Amount</span>
                                    <span>₹{booking.booking_services_selected?.reduce((total, service) => 
                                      total + (service.services?.price || 0), 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {/* Edit Booking Dialog */}
                          {booking.status !== 'cancelled' && booking.status !== 'canceled' && booking.status !== 'completed' && (
                            <Dialog
                              open={Boolean(editingBooking && editingBooking.id === booking.id)}
                              onOpenChange={(open) => {
                                if (!open) setEditingBooking(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingBooking(booking)}
                                  aria-label={`Edit booking ${booking.id}`}
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                </Button>
                              </DialogTrigger>
                            <DialogContent>
                              {editingBooking && (
                                <BookingForm
                                  booking={editingBooking}
                                  onSuccess={() => {
                                    setEditingBooking(null);
                                    fetchBookings();
                                  }}
                                  onCancel={() => setEditingBooking(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          )}
                          {/* Check-in or View Details Button */}
                          {booking.status === "reserved" ? (
                            <motion.button
                              onClick={() => handleCheckIn(booking.id)}
                              whileTap={{ scale: 0.95 }}
                              aria-label={`Check in booking ${booking.id}`}
                              className="flex items-center justify-center p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                            >
                              <Check className="h-4 w-4" />
                            </motion.button>
                          ) : (booking.status === "checked_in" ||
                              booking.status === "progressing" ||
                              booking.status === "completed") ? (
                            <motion.button
                              onClick={() => navigate(`/bookings/${booking.id}`)}
                              whileTap={{ scale: 0.95 }}
                              aria-label={`View details for booking ${booking.id}`}
                              className="flex items-center justify-center p-2 bg-white border border-gray-300 text-gray-600 rounded-full hover:bg-gray-50 hover:border-gray-400 transition"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </motion.button>
                          ) : null}

                          {/* Cancel Booking Dialog - Replace the Delete dialog with Cancel */}
                          {booking.status !== 'cancelled' && booking.status !== 'canceled' && booking.status !== 'completed' && (
                            <Dialog
                              open={cancelId === booking.id}
                              onOpenChange={(open) => {
                                if (!open) setCancelId(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setCancelId(booking.id)}
                                  aria-label={`Cancel booking ${booking.id}`}
                                >
                                  <Ban className="h-4 w-4 mr-1" />
                                </Button>
                              </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Cancellation</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to cancel this booking? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setCancelId(null)}>
                                  No, keep booking
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => cancelId && handleCancel(bookings.find(b => b.id === cancelId))}
                                >
                                  Yes, cancel booking
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {totalCount > ITEMS_PER_PAGE && !loading && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {getPageNumbers().map((pageNum, index) => (
                  <PaginationItem key={index}>
                    {pageNum === "..." ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className={currentPage === pageNum ? "pointer-events-none bg-primary text-white" : "cursor-pointer"}
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
}

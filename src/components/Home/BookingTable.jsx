import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { X, Edit2, Check, ArrowRight, Loader2, Ban, RotateCcw } from "lucide-react";
import { format, parse } from "date-fns";
import toast from "react-hot-toast";
import BookingForm from "./BookingForm";
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

export default function BookingTable() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // Single date picker (default today)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get user role and organization_id from session
  const [userRole, setUserRole] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  
  // Subscription status
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  
  // Check if subscription is inactive
  const isSubscriptionInactive = subscriptionDetails?.subscription_status !== 'active';

  // States for filtering by services:
  const [serviceOptions, setServiceOptions] = useState([]);
  const [selectedServiceFilters, setSelectedServiceFilters] = useState([]);
  const [selectValue, setSelectValue] = useState("");

  // States for filtering by shops
  const [shopOptions, setShopOptions] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10; // Number of bookings per page

  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────────────────────
  // NEW: Payment Mode Display Logic
  // ─────────────────────────────────────────────────────────────────────────────
  /**
   * Parses the booking.historical_bookings?.[0]?.payment_details array
   * and returns a string representing the final display mode, following rules:
   *
   * 1) If only one payment mode, display it.
   * 2) If exactly two payment modes:
   *    - If credit is first => display the second mode
   *    - If credit is second => display "credit"
   *    - If neither is credit => "mode1 + mode2"
   * 3) If more than two, and credit is present => exclude credit, join others with "+"
   * 4) If more than two, and no credit => join all with "+"
   * 5) If no payment_details or parse fails => fallback to booking.historical_bookings?.[0]?.payment_mode
   */
  const getDisplayPaymentMode = (booking) => {
    if (!booking.historical_bookings?.length) {
      // Fallback if no historical record
      return "";
    }

    const hist = booking.historical_bookings[0];
    // Try to parse payment_details
    let paymentDetails;
    try {
      paymentDetails =
        typeof hist.payment_details === "string"
          ? JSON.parse(hist.payment_details)
          : hist.payment_details;
    } catch {
      // fallback if parse fails
      paymentDetails = null;
    }

    // If no payment_details array, fallback to single payment_mode column
    if (!Array.isArray(paymentDetails) || paymentDetails.length === 0) {
      return hist.payment_mode?.toLowerCase() || "";
    }

    // Extract modes in lowercase
    const modes = paymentDetails.map((p) => (p.mode || "").toLowerCase());

    // RULE 1) Only one mode
    if (modes.length === 1) {
      return modes[0] || "";
    }

    // RULE 2) Exactly two modes
    if (modes.length === 2) {
      const [first, second] = modes;
      // credit first
      if (first === "credit" && second !== "credit") {
        return second;
      }
      // credit second
      if (second === "credit" && first !== "credit") {
        return "credit";
      }
      // neither is credit OR both are credit
      if (first === second) {
        return first; // e.g. both "credit"
      }
      return `${first} + ${second}`;
    }

    // RULE 3 & 4) More than two modes
    if (modes.length > 2) {
      const hasCredit = modes.includes("credit");
      if (hasCredit) {
        // exclude credit
        const filtered = modes.filter((m) => m !== "credit");
        // if everything was credit, just show "credit"
        if (!filtered.length) return "credit";
        // join the rest
        return filtered.join(" + ");
      } else {
        // no credit
        return modes.join(" + ");
      }
    }

    return hist.payment_mode?.toLowerCase() || "";
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Shop Options
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchShopOptions = useCallback(async () => {
    try {
      let query = supabase
        .from("shops")
        .select("id, name")
        .order("name");
      
      // Filter shops by organization_id if available
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      const options = [{ value: null, label: "All Shops" }].concat(
        data.map((shop) => ({
          value: shop.id,
          label: shop.name,
        }))
      );
      setShopOptions(options);
    } catch (error) {
      toast.error(`Error fetching shops: ${error.message}`);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchShopOptions();
  }, [fetchShopOptions]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper: Display Sub-slot
  // ─────────────────────────────────────────────────────────────────────────────
  const getSubSlotDisplay = (booking) => {
    const sub = booking.sub_time_slots;
    if (sub) {
      return (
        sub.description ||
        (sub.slot_number ? `Slot ${sub.slot_number}` : "N/A")
      );
    }
    return "N/A";
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Service Options
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchServiceOptions = useCallback(async () => {
    try {
      let query = supabase
        .from("services")
        .select("id, name")
        .order("name");
      
      // Filter services by organization_id if available
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      const options = data.map((service) => ({
        value: service.id,
        label: service.name,
      }));
      setServiceOptions(options);
    } catch (error) {
      toast.error(`Error fetching services: ${error.message}`);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchServiceOptions();
  }, [fetchServiceOptions]);

  const handleServiceSelect = (serviceId) => {
    const selectedService = serviceOptions.find((s) => s.value === serviceId);
    if (selectedService) {
      // Toggle
      if (
        selectedServiceFilters.some((s) => s.value === serviceId)
      ) {
        setSelectedServiceFilters(
          selectedServiceFilters.filter((s) => s.value !== serviceId)
        );
      } else {
        setSelectedServiceFilters([
          ...selectedServiceFilters,
          selectedService,
        ]);
      }
      setSelectValue(""); // reset
    }
  };

  const removeServiceFilter = (serviceId) => {
    setSelectedServiceFilters(
      selectedServiceFilters.filter((s) => s.value !== serviceId)
    );
  };

  const clearAllServiceFilters = () => {
    setSelectedServiceFilters([]);
    setSelectValue("");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Pagination
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (totalCount > 0) {
      setTotalPages(Math.ceil(totalCount / itemsPerPage));
    } else {
      setTotalPages(1);
    }
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [
    totalCount,
    itemsPerPage,
    searchTerm,
    selectedDate,
    selectedServiceFilters,
    selectedShop,
  ]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch Bookings
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      // Get organization_id from user session
      const userSession = JSON.parse(localStorage.getItem("userSession"));
      const userOrgId = userSession?.organization_id;

      if (!userOrgId) {
        toast.error("No organization found. Please log in again.");
        setBookings([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // NEW: Add `payment_details` to the historical_bookings join
      let query = supabase
        .from("bookings")
        .select(
          `
          *,
          sub_time_slots (
            *,
            time_slots (
              start_time
            )
          ),
          booking_services_selected (*, services(*)),
          historical_bookings!historical_bookings_original_booking_id_fkey (
            payment_mode,
            payment_details
          )
        `,
          { count: "exact" }
        )
        .eq("booking_date", formattedDate)
        .eq("organization_id", userOrgId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (searchTerm) {
        query = query.or(
          `customer_name.ilike.%${searchTerm}%,dog_breed.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,dog_name.ilike.%${searchTerm}%`
        );
      }

      // Shop filter
      if (selectedShop) {
        query = query.eq("shop_id", selectedShop);
      }

      // Services filter
      if (selectedServiceFilters.length > 0) {
        const selectedServiceIds = selectedServiceFilters.map(
          (service) => service.value
        );
        const { data: bookingIds, error: serviceError } = await supabase
          .from("booking_services_selected")
          .select("booking_id")
          .in("service_id", selectedServiceIds);

        if (serviceError) throw serviceError;

        if (bookingIds && bookingIds.length > 0) {
          const uniqueBookingIds = [
            ...new Set(bookingIds.map((item) => item.booking_id)),
          ];
          query = query.in("id", uniqueBookingIds);
        } else {
          setBookings([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }
      }

      const { data: bookingsData, error: bookingsError, count } =
        await query;
      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);
      setTotalCount(count || 0);
    } catch (error) {
      toast.error(`Error fetching bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    selectedDate,
    searchTerm,
    selectedServiceFilters,
    selectedShop,
    currentPage,
    itemsPerPage,
    organizationId, // Add organizationId to dependencies
  ]);

  useEffect(() => {
    fetchBookings();
  }, [
    searchTerm,
    selectedDate,
    selectedServiceFilters,
    selectedShop,
    currentPage,
    fetchBookings,
  ]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("custom-all-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          console.log("Change received!", payload);
          fetchBookings();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchTerm, selectedDate, selectedServiceFilters, currentPage, fetchBookings]);

  useEffect(() => {
    const userSession = JSON.parse(localStorage.getItem("userSession"));
    if (userSession) {
      setUserRole(userSession.type === "staff" ? "staff" : "admin");
      setOrganizationId(userSession.organization_id);
    }
  }, []);

  // Separate useEffect for subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!organizationId) return;
      
      setLoadingSubscription(true);
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .order('subscription_end_date', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        setSubscriptionDetails(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, [organizationId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Undo Cancel
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleUndoCancel(booking) {
    setLoading(true);
    try {
      // Remove from historical_bookings if it was canceled or completed
      const { error: deleteError } = await supabase
        .from("historical_bookings")
        .delete()
        .eq("original_booking_id", booking.id)
        .in("status", ["cancelled", "completed"]);
      if (deleteError) throw deleteError;

      // Update status back to "progressing"
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "progressing" })
        .eq("id", booking.id);
      if (updateError) throw updateError;

      toast.success("Booking restored to progressing.");
      fetchBookings();
    } catch (error) {
      toast.error(`Error restoring booking: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cancel Booking
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleCancel(booking) {
    setLoading(true);
    try {
      // 1) Shop name
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("name")
        .eq("id", booking.shop_id)
        .single();
      if (shopError) throw shopError;

      // 2) Sub_time_slot description
      let slotDescription = "N/A";
      if (booking.sub_time_slot_id) {
        const { data: slotData, error: slotError } = await supabase
          .from("sub_time_slots")
          .select("description, slot_number")
          .eq("id", booking.sub_time_slot_id)
          .single();
        if (slotError) throw slotError;
        slotDescription =
          slotData.description ||
          (slotData.slot_number ? `Slot ${slotData.slot_number}` : "N/A");
      }

      // 3) Services
      const { data: servicesData, error: servicesError } = await supabase
        .from("booking_services_selected")
        .select("service_id, services(name, price)")
        .eq("booking_id", booking.id);
      if (servicesError) throw servicesError;
      const services = servicesData.map((item) => ({
        id: item.service_id,
        name: item.services?.name || "Unknown",
        price: item.services?.price || 0,
      }));

      // 4) Feedback
      const { data: feedbackData } = await supabase
        .from("booking_feedback")
        .select("*")
        .eq("booking_id", booking.id);

      // 5) Insert to historical_bookings
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
          organization_id: booking.organization_id,
          status: "cancelled",
          services: services.length > 0 ? JSON.stringify(services) : null,
          feedback:
            feedbackData && feedbackData.length > 0
              ? JSON.stringify(feedbackData[0])
              : null,
          shop_name: shopData?.name || null,
          slot_description: slotDescription,
        });
      if (historyError) throw historyError;

      // 6) Update bookings status
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Check In
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleCheckIn(bookingId) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "checked_in",
          check_in_time: new Date().toISOString(),
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Format Time
  // ─────────────────────────────────────────────────────────────────────────────
  const formatTimeIST = (timeStr) => {
    try {
      return format(parse(timeStr, "HH:mm:ss", new Date()), "hh:mm a");
    } catch (error) {
      return "N/A";
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Pagination Items
  // ─────────────────────────────────────────────────────────────────────────────
  const renderPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => (
        <PaginationItem key={i + 1}>
          <PaginationLink
            href="#"
            isActive={currentPage === i + 1}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(i + 1);
            }}
          >
            {i + 1}
          </PaginationLink>
        </PaginationItem>
      ));
    }

    // Show first page, last page, etc.
    const items = [];
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          href="#"
          isActive={currentPage === 1}
          onClick={(e) => {
            e.preventDefault();
            handlePageChange(1);
          }}
        >
          1
        </PaginationLink>
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
          <PaginationLink
            href="#"
            isActive={currentPage === i}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(i);
            }}
          >
            {i}
          </PaginationLink>
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
          <PaginationLink
            href="#"
            isActive={currentPage === totalPages}
            onClick={(e) => {
              e.preventDefault();
              handlePageChange(totalPages);
            }}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 mb-2">
        <Input
          type="text"
          placeholder="Search by customer, breed, contact, dog name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64"
          aria-label="Search Bookings"
        />

        {/* Shop Filter Select */}
        <div className="w-full sm:w-72">
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

        {/* Service Filter Select */}
        <div className="w-full sm:w-72">
          <Select
            value={selectValue}
            onValueChange={(val) => {
              handleServiceSelect(val);
            }}
          >
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
                      {selectedServiceFilters.some(
                        (s) => s.value === service.value
                      ) && <Check className="h-4 w-4 ml-2 text-primary" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Date Picker */}
        <div className="flex justify-center md:justify-start">
  <DatePickerDemo date={selectedDate} setDate={setSelectedDate} />
</div>

      </div>

      {/* Display selected service filters as badges */}
      {selectedServiceFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 my-2">
          {selectedServiceFilters.map((service) => (
            <Badge
              key={service.value}
              variant="secondary"
              className="flex items-center"
            >
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

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>
            Manage your dog grooming appointments for{" "}
            {format(selectedDate, "PPP")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2
                className="h-6 w-6 animate-spin text-primary"
                aria-label="Loading bookings"
              />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No bookings found.
            </p>
          ) : (
            <div className="border-none overflow-x-auto">
              {/* ─────────────────────────────────────────────────────────────
                  DESKTOP TABLE
                  ───────────────────────────────────────────────────────────── */}
              <div className="hidden border border-gray-300 md:block rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-gray-200 text-gray-800">
                        No.
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Customer
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Contact
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Dog
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Breed
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Date
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Time Slot
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Sub Slot
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Status
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Total Bill
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Payment Mode
                      </TableHead>
                      <TableHead className="bg-gray-200 text-gray-800">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-gray-50">
                    {bookings.map((booking, index) => {
                      // compute display mode
                      const displayPaymentMode = getDisplayPaymentMode(booking);
                      // compute total
                      const totalBill = (
                        booking.booking_services_selected?.reduce(
                          (acc, s) => acc + (s.services?.price || 0),
                          0
                        ) || 0
                      ).toFixed(2);

                      return (
                        <TableRow key={booking.id}>
                          <TableCell>
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell>{booking.customer_name}</TableCell>
                          <TableCell>{booking.contact_number}</TableCell>
                          <TableCell>{booking.dog_name}</TableCell>
                          <TableCell>{booking.dog_breed}</TableCell>
                          <TableCell>
                            {format(
                              new Date(booking.booking_date),
                              "MMM dd, yyyy"
                            )}
                          </TableCell>
                          <TableCell>
                            {booking.slot_time
                              ? formatTimeIST(booking.slot_time)
                              : "N/A"}
                          </TableCell>
                          <TableCell>{getSubSlotDisplay(booking)}</TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full font-medium p-1 text-xs ${
                                booking.status === "reserved"
                                  ? "bg-yellow-200 text-yellow-700 border border-yellow-300"
                                  : booking.status === "checked_in"
                                  ? "bg-purple-200 text-purple-700 border border-purple-300"
                                  : booking.status === "progressing"
                                  ? "bg-blue-200 text-blue-700 border border-blue-300"
                                  : booking.status === "completed"
                                  ? "bg-green-200 text-green-700 border border-green-300"
                                  : booking.status === "canceled" ||
                                    booking.status === "cancelled"
                                  ? "bg-red-200 text-red-700 border border-red-300"
                                  : "bg-gray-200 text-gray-700 border border-gray-300"
                              }`}
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {booking.status
                                .replace("_", " ")
                                .toUpperCase()}
                            </span>
                          </TableCell>

                          {/* TOTAL BILL (click -> popover) */}
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  // If final payment mode is "credit", show total in red
                                  className={`font-medium flex items-center gap-2 ${
                                    displayPaymentMode === "credit"
                                      ? "text-red-600"
                                      : ""
                                  }`}
                                >
                                  ₹{totalBill}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-6">
                                <div className="space-y-6">
                                  <div className="space-y-3">
                                    <div className="text-sm font-medium">
                                      Services
                                    </div>
                                    {booking.booking_services_selected
                                      ?.length > 0 ? (
                                      booking.booking_services_selected.map(
                                        (service, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between items-center text-sm py-1"
                                          >
                                            <span>
                                              {service.services?.name}
                                            </span>
                                            <span>
                                              ₹
                                              {service.services?.price.toFixed(
                                                2
                                              )}
                                            </span>
                                          </div>
                                        )
                                      )
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        No services selected
                                      </p>
                                    )}
                                  </div>
                                  {booking.booking_services_selected?.length >
                                    0 && (
                                    <div className="pt-4 border-t">
                                      <div className="flex justify-between items-center font-semibold">
                                        <span>Total Amount</span>
                                        <span>₹{totalBill}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>

                          {/* PAYMENT MODE BADGE */}
                          <TableCell>
                            {displayPaymentMode && (
                              <span
                                className={`rounded-full font-medium p-1 text-xs ${
                                  displayPaymentMode === "credit"
                                    ? "bg-red-200 text-red-700 border border-red-300"
                                    : "bg-blue-200 text-blue-700 border border-blue-300"
                                }`}
                                style={{ whiteSpace: "nowrap" }}
                              >
                                {displayPaymentMode.toUpperCase()}
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex space-x-2">
                              {/* Edit Booking Dialog */}
                              {booking.status !== "cancelled" &&
                                booking.status !== "canceled" &&
                                booking.status !== "completed" && (
                                  <Dialog
                                    open={
                                      Boolean(
                                        editingBooking &&
                                          editingBooking.id === booking.id
                                      )
                                    }
                                    onOpenChange={(open) => {
                                      if (!open) setEditingBooking(null);
                                    }}
                                  >
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => !isSubscriptionInactive && setEditingBooking(booking)}
                                        disabled={isSubscriptionInactive}
                                        style={isSubscriptionInactive ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                                        aria-label={`Edit booking ${booking.id}`}
                                      >
                                        <Edit2 className="h-4 w-4" />
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
                                          onCancel={() =>
                                            setEditingBooking(null)
                                          }
                                        />
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                )}

                              {/* Undo Cancel */}
                              {(booking.status === "cancelled" ||
                                booking.status === "canceled" ||
                                booking.status === "completed") &&
                                userRole === "admin" && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700"
                                        disabled={isSubscriptionInactive}
                                        style={isSubscriptionInactive ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                                        aria-label={`Undo cancellation for booking ${booking.id}`}
                                      >
                                        <RotateCcw className="h-4 w-4 mr-1" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Confirm Restoration
                                        </DialogTitle>
                                        <DialogDescription>
                                          Are you sure you want to restore
                                          this booking? This will set the
                                          status back to progressing.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <Button
                                          variant="default"
                                          className="bg-amber-600 hover:bg-amber-700"
                                          onClick={() => !isSubscriptionInactive && handleUndoCancel(booking)}
                                          disabled={isSubscriptionInactive}
                                          style={isSubscriptionInactive ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                                        >
                                          Yes, restore booking
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}

                              {/* Check-in or Details */}
                              {booking.status === "reserved" ? (
                                <motion.button
                                  onClick={() => !isSubscriptionInactive && handleCheckIn(booking.id)}
                                  whileTap={{ scale: 0.95 }}
                                  aria-label={`Check in booking ${booking.id}`}
                                  disabled={isSubscriptionInactive}
                                  style={isSubscriptionInactive ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                                  className="flex items-center justify-center p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                                >
                                  <Check className="h-4 w-4" />
                                </motion.button>
                              ) : booking.status === "checked_in" ||
                                booking.status === "progressing" ||
                                booking.status === "completed" ? (
                                <motion.button
                                  onClick={() => !isSubscriptionInactive && navigate(`/bookings/${booking.id}`)}
                                  whileTap={{ scale: 0.95 }}
                                  aria-label={`View details for booking ${booking.id}`}
                                  disabled={isSubscriptionInactive}
                                  style={isSubscriptionInactive ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                                  className="flex items-center justify-center p-2 bg-white border border-gray-300 text-gray-600 rounded-full hover:bg-gray-50 hover:border-gray-400 transition"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </motion.button>
                              ) : null}

                              {/* Cancel Booking */}
                              {booking.status !== "cancelled" &&
                                booking.status !== "canceled" &&
                                booking.status !== "completed" && (
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
                                        onClick={() => !isSubscriptionInactive && setCancelId(booking.id)}
                                        disabled={isSubscriptionInactive}
                                        style={isSubscriptionInactive ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
                                        aria-label={`Cancel booking ${booking.id}`}
                                      >
                                        <Ban className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>
                                          Confirm Cancellation
                                        </DialogTitle>
                                        <DialogDescription>
                                          Are you sure you want to cancel
                                          this booking? This action cannot be
                                          undone.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <Button
                                          variant="destructive"
                                          onClick={() =>
                                            !isSubscriptionInactive && cancelId &&
                                            handleCancel(
                                              bookings.find(
                                                (b) => b.id === cancelId
                                              )
                                            )
                                          }
                                          disabled={isSubscriptionInactive}
                                          style={isSubscriptionInactive ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  MOBILE VIEW
                  ───────────────────────────────────────────────────────────── */}
              <div className="md:hidden  space-y-4">
                {bookings.map((booking, index) => {
                  const displayPaymentMode = getDisplayPaymentMode(booking);
                  const totalBill = (
                    booking.booking_services_selected?.reduce(
                      (acc, s) => acc + (s.services?.price || 0),
                      0
                    ) || 0
                  ).toFixed(2);

                  return (
                    <Card key={booking.id} className="bg-white ">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {booking.customer_name}
                            </CardTitle>
                            <CardDescription>
                              {booking.contact_number}
                            </CardDescription>
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
                                : booking.status === "canceled" ||
                                  booking.status === "cancelled"
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
                              {format(
                                new Date(booking.booking_date),
                                "MMM dd, yyyy"
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Time:</span>
                            <span className="font-medium">
                              {booking.slot_time
                                ? formatTimeIST(booking.slot_time)
                                : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Sub Slot:</span>
                            <span className="font-medium">
                              {getSubSlotDisplay(booking)}
                            </span>
                          </div>
                          {/* TOTAL BILL */}
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Total Bill:</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className={`font-medium text-sm flex items-center gap-2 ${
                                    displayPaymentMode === "credit"
                                      ? "text-red-600"
                                      : ""
                                  }`}
                                >
                                  ₹{totalBill}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-6">
                                <div className="space-y-6">
                                  <div className="space-y-3">
                                    <div className="text-sm font-medium">
                                      Services
                                    </div>
                                    {booking.booking_services_selected
                                      ?.length > 0 ? (
                                      booking.booking_services_selected.map(
                                        (service, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between items-center text-sm py-1"
                                          >
                                            <span>{service.services?.name}</span>
                                            <span>
                                              ₹
                                              {service.services?.price.toFixed(
                                                2
                                              )}
                                            </span>
                                          </div>
                                        )
                                      )
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        No services selected
                                      </p>
                                    )}
                                  </div>
                                  {booking.booking_services_selected?.length >
                                    0 && (
                                    <div className="pt-4 border-t">
                                      <div className="flex justify-between items-center font-semibold">
                                        <span>Total Amount</span>
                                        <span>₹{totalBill}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          {/* PAYMENT MODE */}
                          {displayPaymentMode && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">
                                Payment Mode:
                              </span>
                              <span
                                className={`rounded-full font-medium p-1 text-xs ${
                                  displayPaymentMode === "credit"
                                    ? "bg-red-200 text-red-700 border border-red-300"
                                    : "bg-blue-200 text-blue-700 border border-blue-300"
                                }`}
                              >
                                {displayPaymentMode.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end space-x-2 pt-2">
                        {/* Undo Cancel (Mobile) */}
                        {(booking.status === "cancelled" ||
                          booking.status === "canceled" ||
                          booking.status === "completed") &&
                          userRole === "admin" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700"
                                  aria-label={`Undo cancellation for booking ${booking.id}`}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirm Restoration</DialogTitle>
                                  <DialogDescription>
                                    Restore status back to progressing?
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="default"
                                    className="bg-amber-600 hover:bg-amber-700"
                                    onClick={() => handleUndoCancel(booking)}
                                  >
                                    Yes, restore booking
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}

                        {/* Not cancelled => Show Edit/Cancel */}
                        {booking.status !== "cancelled" &&
                          booking.status !== "canceled" &&
                          booking.status !== "completed" && (
                            <>
                              <Dialog
                                open={
                                  Boolean(
                                    editingBooking &&
                                      editingBooking.id === booking.id
                                  )
                                }
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
                                    <Edit2 className="h-4 w-4" />
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
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>
                                      Confirm Cancellation
                                    </DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to cancel this
                                      booking? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button
                                      variant="destructive"
                                      onClick={() =>
                                        cancelId &&
                                        handleCancel(
                                          bookings.find(
                                            (b) => b.id === cancelId
                                          )
                                        )
                                      }
                                    >
                                      Yes, cancel booking
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </>
                          )}

                        {booking.status === "reserved" && (
                          <motion.button
                            onClick={() => handleCheckIn(booking.id)}
                            whileTap={{ scale: 0.95 }}
                            aria-label={`Check in booking ${booking.id}`}
                            className="flex items-center justify-center p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"
                          >
                            <Check className="h-4 w-4" />
                          </motion.button>
                        )}

                        {(booking.status === "checked_in" ||
                          booking.status === "progressing" ||
                          booking.status === "completed") && (
                          <motion.button
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                            whileTap={{ scale: 0.95 }}
                            aria-label={`View details for booking ${booking.id}`}
                            className="flex items-center justify-center p-2 bg-white border border-gray-300 text-gray-600 rounded-full hover:bg-gray-50 hover:border-gray-400 transition"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </motion.button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between items-center">
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) handlePageChange(currentPage - 1);
                    }}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {renderPaginationItems()}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
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

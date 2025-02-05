
// src/components/Home/BookingTable.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Check, ArrowRight, Loader2 } from "lucide-react";
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
import { DatePickerDemo } from "@/components/ui/DatePickerDemo"; // Our normal date picker

const ITEMS_PER_PAGE = 10;

export default function BookingTable() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Instead of a date range, we use a single date picker. Default is today.
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const navigate = useNavigate();

  async function fetchBookings() {
    setLoading(true);
    try {
      // Format the selected date in "yyyy-MM-dd" format.
      const formattedDate = format(selectedDate, "yyyy-MM-dd");

      // Base query with joins
      let query = supabase
        .from("bookings")
        .select(`
          *,
          sub_time_slots (
            *,
            time_slots (
              start_time
            )
          )
        `)
        // Only show bookings for the selected date.
        .eq("booking_date", formattedDate)
        // Show latest bookings first.
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      // Apply search filters if provided.
      if (searchTerm) {
        query = query.or(
          `customer_name.ilike.%${searchTerm}%,dog_breed.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,dog_name.ilike.%${searchTerm}%`
        );
      }

      // Fetch data with count.
      const { data: bookingsData, error: bookingsError, count } = await query.select("*", { count: "exact" });
      if (bookingsError) throw bookingsError;

      setBookings(bookingsData || []);
      setTotalCount(count || 0);
    } catch (error) {
      toast.error(`Error fetching bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, [currentPage, searchTerm, selectedDate]);

  useEffect(() => {
    // Set up real-time subscription for bookings changes.
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
  }, [currentPage, searchTerm, selectedDate]);

  async function handleDelete(id) {
    setLoading(true);
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
      toast.success("Booking deleted successfully!");
      if (bookings.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchBookings();
      }
    } catch (error) {
      toast.error(`Error deleting booking: ${error.message}`);
    } finally {
      setDeleteId(null);
      setLoading(false);
    }
  }

  async function handleCheckIn(bookingId) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "checked_in" })
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

  // Helper function: if sub_time_slots is an array, show the first element.
const getSubSlotDisplay = (booking) => {
  const sub = booking.sub_time_slots;
  if (sub) {
    // If description exists, return it; otherwise, show the slot number.
    return sub.description || `Slot ${sub.slot_number}` || "N/A";
  }
  return "N/A";
};


  // For pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      if (startPage > 2) pages.push("...");
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      if (endPage < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div>
      {/* Top bar with search, date picker, and "View All Bookings" button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
          <Input
            type="text"
            placeholder="Search by customer, breed, contact, dog name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2 sm:mb-0 sm:flex-1"
            aria-label="Search Bookings"
          />
          {/* Use a normal date picker */}
          <div className="sm:w-64">
            <DatePickerDemo date={selectedDate} setDate={setSelectedDate} />
          </div>
        </div>
        <div className="mt-2 sm:mt-0">
          <Button onClick={() => navigate("/all-bookings")}>
            View All Bookings
          </Button>
        </div>
      </div>

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
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="w-14">No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Dog</TableHead>
                    <TableHead>Breed</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead>Sub Slot</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell>{format(new Date(booking.booking_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {booking.slot_time
                          ? format(parse(booking.slot_time, "HH:mm:ss", new Date()), "hh:mm a")
                          : "N/A"}
                      </TableCell>
                      <TableCell>{getSubSlotDisplay(booking)}</TableCell>

                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === "reserved"
                              ? "bg-yellow-100 text-yellow-800"
                              : booking.status === "checked_in"
                              ? "bg-green-100 text-green-800"
                              : booking.status === "progressing"
                              ? "bg-blue-100 text-blue-800"
                              : booking.status === "completed"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {booking.status.replace("_", " ").toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {/* Edit Button */}
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

                          {/* Check-in / View Details Button */}
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
                              className="flex items-center justify-center p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </motion.button>
                          ) : null}

                          {/* Delete Button with Confirmation Dialog */}
                          <Dialog
                            open={deleteId === booking.id}
                            onOpenChange={(open) => {
                              if (!open) setDeleteId(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteId(booking.id)}
                                aria-label={`Delete booking ${booking.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this booking? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteId(null)}>
                                  Cancel
                                </Button>
                                <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
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


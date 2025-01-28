// src/components/Home/BookingTable.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, ArrowRight } from "lucide-react"; // Added ArrowRight for navigation
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
import { Card, CardTitle, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
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
import { DateRangePicker } from "@/components/ui/DateRangePicker"; // Import your DateRangePicker component
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation

const ITEMS_PER_PAGE = 10;

export default function BookingTable() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // New state variables for search and date range filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const navigate = useNavigate(); // Initialize useNavigate

  async function fetchBookings() {
    setLoading(true);
    try {
      // Base query with necessary joins
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
        .order("created_at", { ascending: false }) // Fetch latest bookings first
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      // Apply search filters
      if (searchTerm) {
        query = query.or(
          `customer_name.ilike.%${searchTerm}%,dog_breed.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,dog_name.ilike.%${searchTerm}%`
        );
      }

      // Apply date range filter
      if (dateRange?.from) {
        const from = format(dateRange.from, "yyyy-MM-dd");
        const to = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : from;
        query = query.gte("booking_date", from).lte("booking_date", to);
      }

      // Fetch data with count
      const { data: bookingsData, error: bookingsError, count } = await query
        .select("*", { count: "exact" }); // Ensure count is fetched

      if (bookingsError) throw bookingsError;

      // Log the data to inspect the structure
      console.log('Bookings data:', bookingsData);

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
  }, [currentPage, searchTerm, dateRange]); // Refetch when page, search, or date range changes

  useEffect(() => {
    // Set up real-time subscription channels for bookings changes
    const channel = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('Change received!', payload);
          fetchBookings(); // Refetch bookings on any change
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage, searchTerm, dateRange]);

  // Handle deletion of a booking
  async function handleDelete(id) {
    setLoading(true); // Optionally show loading state during deletion
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) {
        throw error;
      }
      toast.success("Booking deleted successfully!");
      // If we're on a page with only one item and it's not the first page,
      // go to previous page after deletion
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

  // Handle check-in action
  async function handleCheckIn(bookingId) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: 'checked_in' })
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

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate middle pages
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('...');
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div>
      {/* Search Input and Date Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-4">
        <Input
          type="text"
          placeholder="Search by customer, breed, contact, dog name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-2 sm:mb-0 sm:flex-1"
        />
        <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>Manage your dog grooming appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <span>Loading...</span>
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
                    <TableHead>Sub Slot</TableHead> {/* Added Sub Slot Column */}
                    <TableHead>Status</TableHead> {/* Added Status Column */}
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
                          ? format(parse(booking.slot_time, 'HH:mm:ss', new Date()), "hh:mm a")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {booking.sub_time_slots?.description || `Slot ${booking.sub_time_slots?.slot_number}` || "N/A"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-white ${
                            booking.status === 'reserved'
                              ? 'bg-yellow-500'
                              : booking.status === 'checked_in'
                              ? 'bg-green-500'
                              : booking.status === 'progressing'
                              ? 'bg-blue-500'
                              : booking.status === 'completed'
                              ? 'bg-indigo-500'
                              : 'bg-red-500'
                          }`}
                        >
                          {booking.status.replace('_', ' ').toUpperCase()}
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
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              {editingBooking && (
                                <BookingForm
                                  booking={editingBooking}
                                  onSuccess={() => {
                                    setEditingBooking(null); // This will close the dialog
                                    fetchBookings(); // Refresh the table data
                                  }}
                                  onCancel={() => setEditingBooking(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          {/* Check-in Button or Arrow Button */}
                          {booking.status === 'reserved' ? (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleCheckIn(booking.id)}
                              aria-label={`Check in booking ${booking.id}`}
                            >
                              Check-in
                            </Button>
                          ) : (booking.status === 'checked_in' || booking.status === 'progressing') ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/bookings/${booking.id}`)}
                              aria-label={`View details for booking ${booking.id}`}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
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
                                <Button
                                  variant="outline"
                                  onClick={() => setDeleteId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteId && handleDelete(deleteId)}
                                >
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
        {/* Pagination */}
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
                    {pageNum === '...' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className={currentPage === pageNum ? "pointer-events-none" : "cursor-pointer"}
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

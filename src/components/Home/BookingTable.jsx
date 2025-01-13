// src/components/BookingTable.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays } from "date-fns"; 
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Loader2, Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import EditBookingForm from "./BookingForm";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton as ShadcnSkeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/DateRangePicker"; // Import our DateRangePicker component
import { Input } from "@/components/ui/input"

const ITEMS_PER_PAGE = 10;

export default function BookingTable() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // New state variables for search and date range filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  async function fetchBookings() {
    setLoading(true);
    try {
      const { count, error: countError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;
      setTotalCount(count);

      const { data, error } = await supabase
        .from("bookings")
        .select("*, time_slot:time_slot_id(start_time)")
        .order("booking_date", { ascending: true })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      toast.error(`Error fetching bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBookings();
  }, [currentPage]);

  useEffect(() => {
    const channel = supabase
      .channel('public:bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleDelete(id) {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      toast.error(`Error deleting booking: ${error.message}`);
    } else {
      toast.success("Booking deleted successfully!");
      if (bookings.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchBookings();
      }
    }
    setDeleteId(null);
  }

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
      if (startPage > 2) pages.push('...');
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {/* Skeleton Header */}
        <div className="flex justify-between items-center">
          <ShadcnSkeleton className="h-8 w-1/3 rounded-lg bg-gray-200 animate-pulse" />
          <ShadcnSkeleton className="h-8 w-1/4 rounded-lg bg-gray-200 animate-pulse" />
        </div>
  
        {/* Skeleton Table */}
        <div className="space-y-2">
          {/* Table Header Skeleton */}
          <div className="flex space-x-2">
            {[...Array(8)].map((_, idx) => (
              <ShadcnSkeleton
                key={idx}
                className="h-6 flex-1 bg-gray-200 animate-pulse rounded-lg"
              />
            ))}
          </div>
  
          {/* Table Row Skeleton */}
          {[...Array(5)].map((_, rowIdx) => (
            <div key={rowIdx} className="flex space-x-2">
              {[...Array(8)].map((_, cellIdx) => (
                <ShadcnSkeleton
                  key={`${rowIdx}-${cellIdx}`}
                  className="h-6 flex-1 bg-gray-100 animate-pulse rounded-md"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  

  // Filter bookings based on searchTerm and dateRange
  const filteredBookings = bookings.filter(booking => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      booking.customer_name.toLowerCase().includes(term) ||
      booking.dog_breed.toLowerCase().includes(term) ||
      booking.contact_number.includes(term) ||
      booking.dog_name.toLowerCase().includes(term);
  
    let matchesDateRange = true;
    if (dateRange?.from) {
      const from = dateRange.from;
      // Add one day to the 'to' date to make the range inclusive
      const to = dateRange.to ? addDays(dateRange.to, 1) : dateRange.from;
      const bookingDate = new Date(booking.booking_date);
      // Use less-than comparison for end date after adding a day
      matchesDateRange = bookingDate >= from && bookingDate < to;
    }
  
    return matchesSearch && matchesDateRange;
  });
  

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
        <DateRangePicker dateRange={dateRange} setDateRange={setDateRange}  />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>Manage your dog grooming appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No bookings found.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="w-14">No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Dog</TableHead>
                    <TableHead>Breed</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking, index) => (
                    <TableRow key={booking.id}>
                      <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                      <TableCell>{booking.customer_name}</TableCell>
                      <TableCell>{booking.contact_number}</TableCell>
                      <TableCell>{booking.dog_name}</TableCell>
                      <TableCell>{booking.dog_breed}</TableCell>
                      <TableCell>{booking.dog_size}</TableCell>
                      <TableCell>{format(new Date(booking.booking_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {booking.slot_time
                          ? booking.slot_time.split(":").slice(0, 2).join(":")
                          : booking.time_slot
                          ? booking.time_slot.start_time.split(":").slice(0, 2).join(":")
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {/* Edit Button */}
                          <Dialog
                            open={editingBooking?.id === booking.id}
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
                              <DialogHeader></DialogHeader>
                              {editingBooking && (
                                <EditBookingForm
                                  booking={editingBooking}
                                  onSave={() => {
                                    setEditingBooking(null);
                                    fetchBookings();
                                  }}
                                  onCancel={() => setEditingBooking(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>

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
                                <Button variant="outline" onClick={() => setDeleteId(null)}>
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
         {totalCount > ITEMS_PER_PAGE && (
          <div className="my-2 flex justify-center">
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
        )}      </Card>
    </div>
  );
}


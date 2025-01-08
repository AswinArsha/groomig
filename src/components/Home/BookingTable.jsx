import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const ITEMS_PER_PAGE = 10;

export default function BookingTable() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Fetch bookings from Supabase with pagination
  async function fetchBookings() {
    setLoading(true);
    try {
      // Fetch total count
      const { count, error: countError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;
      setTotalCount(count);

      // Fetch paginated data
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
  }, [currentPage]); // Refetch when page changes

  useEffect(() => {
    // Set up real-time subscription channel for bookings changes
    const channel = supabase
      .channel('public:bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          // Refresh bookings on any change (INSERT, UPDATE, DELETE)
          fetchBookings();
        }
      )
      .subscribe();
  
    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Handle deletion of a booking
  async function handleDelete(id) {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      toast.error(`Error deleting booking: ${error.message}`);
    } else {
      toast.success("Booking deleted successfully!");
      // If we're on a page with only one item and it's not the first page,
      // go to previous page after deletion
      if (bookings.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchBookings();
      }
    }
    setDeleteId(null);
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

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="w-full h-6" />
        <Skeleton className="w-full h-6" />
        <Skeleton className="w-full h-6" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
        <CardDescription>Manage your dog grooming appointments</CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
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
              {bookings.map((booking, index) => (
                <TableRow key={booking.id}>
                  <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                  <TableCell>{booking.customer_name}</TableCell>
                  <TableCell>{booking.contact_number}</TableCell>
                  <TableCell>{booking.dog_name}</TableCell>
                  <TableCell>{booking.dog_breed}</TableCell>
                  <TableCell>{booking.dog_size}</TableCell>
                  <TableCell>
                    {format(new Date(booking.booking_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
  {booking.time_slot
    ? `${booking.time_slot.start_time}`
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
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                          
                          </DialogHeader>
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
                            Delete
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
          </Table></div>
        )}
        {totalCount > ITEMS_PER_PAGE && (
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
      </CardContent>
    </Card>
  );
}
import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, X, Download } from "lucide-react";
import { format, parse } from "date-fns";
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

export default function BookingTable() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState({ from: new Date(), to: new Date() });
  const [serviceOptions, setServiceOptions] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectValue, setSelectValue] = useState(""); // Add this new state
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

  useEffect(() => {
    fetchServiceOptions();
  }, [fetchServiceOptions]);

  const handleServiceSelect = (serviceId) => {
    const selectedService = serviceOptions.find(service => service.value === serviceId);
    if (selectedService && !selectedServices.some(s => s.value === serviceId)) {
      setSelectedServices([...selectedServices, selectedService]);
      setSelectValue(""); // Reset select value after selection
    }
  };

  const removeService = (serviceId) => {
    setSelectedServices(selectedServices.filter(service => service.value !== serviceId));
  };

  const clearAllServices = () => {
    setSelectedServices([]);
    setSelectValue(""); // Reset select value when clearing all
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    
    // Add title and filters info
    doc.setFontSize(16);
    doc.text('Bookings Report', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Date Range: ${format(selectedDate.from, "MMM dd, yyyy")} - ${format(selectedDate.to, "MMM dd, yyyy")}`, 14, 25);
    
    if (selectedServices.length > 0) {
      const servicesText = `Services: ${selectedServices.map(s => s.label).join(', ')}`;
      doc.text(servicesText, 14, 32);
    }
    
    if (searchTerm) {
      doc.text(`Search Term: ${searchTerm}`, 14, selectedServices.length > 0 ? 39 : 32);
    }

    // Define the table columns
    const columns = [
      'No.',
      'Customer',
      'Contact',
      'Dog',
      'Breed',
      'Date',
      'Time',
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
      booking.slot_time ? formatTimeIST(booking.slot_time) : "N/A",
      booking.status.replace("_", " ").toUpperCase()
    ]);

    // Add the table
    doc.autoTable({
      head: [columns],
      body: data,
      startY: selectedServices.length > 0 || searchTerm ? 45 : 35,
      headStyles: { fillColor: [51, 51, 51] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 15 },
        7: { cellWidth: 25 }
      }
    });

    // Save the PDF
    doc.save('bookings-report.pdf');
  };

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const formattedDateFrom = format(selectedDate.from, "yyyy-MM-dd");
      const formattedDateTo = format(selectedDate.to, "yyyy-MM-dd");

      let query = supabase
        .from("bookings")
        .select(`
          *,
          sub_time_slots!bookings_sub_time_slot_id_fkey (
            slot_number,
            description,
            time_slots (
              start_time
            )
          )
        `, { count: "exact" })
        .gte("booking_date", formattedDateFrom)
        .lte("booking_date", formattedDateTo)
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (searchTerm) {
        query = query.or(
          `customer_name.ilike.%${searchTerm}%,dog_breed.ilike.%${searchTerm}%,contact_number.ilike.%${searchTerm}%,dog_name.ilike.%${searchTerm}%`
        );
      }

      if (selectedServices.length > 0) {
        const selectedServiceIds = selectedServices.map(service => service.value);
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

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setBookings(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      toast.error(`Error fetching bookings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, searchTerm, currentPage, selectedServices]);

  useEffect(() => {
    setCurrentPage(1);
    fetchBookings();
  }, [searchTerm, selectedDate, selectedServices]);

  useEffect(() => {
    fetchBookings();
  }, [currentPage]);

  // Format time
  const formatTimeIST = (timeStr) => {
    try {
      return format(parse(timeStr, "HH:mm:ss", new Date()), "hh:mm a");
    } catch (error) {
      return "N/A";
    }
  };

  return (
    <div className="container ">
    {/* Controls */}
    <div className="flex flex-col space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
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
  <Input
    type="text"
    placeholder="Search bookings..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full sm:w-64 md:w-80 flex-1"
  />

  {/* Service Filter Dropdown */}
  <Select value={selectValue} onValueChange={handleServiceSelect}>
    <SelectTrigger className="w-full sm:w-72">
      <SelectValue placeholder="Filter by services..." />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        {serviceOptions.map((service) => (
          <SelectItem 
            key={service.value} 
            value={service.value}
            disabled={selectedServices.some(s => s.value === service.value)}
          >
            {service.label}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>

  {/* Date Picker */}
  <div className="w-full sm:w-64">
    <CalendarDatePicker date={selectedDate} onDateSelect={setSelectedDate} />
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
   {selectedServices.length > 0 && (
      <div className="flex flex-wrap gap-3 items-center">
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
    
      {selectedServices.length > 0 && (
     <Button
     variant="outline"
     size="sm"
     onClick={clearAllServices}
     className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
   >
     Clear all
   </Button>

      )}
    </div>
 
      )}
    </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            Viewing bookings from {format(selectedDate.from, "PPP")} to{" "}
            {format(selectedDate.to, "PPP")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
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
                    <TableCell>
                      {format(new Date(booking.booking_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {booking.slot_time ? formatTimeIST(booking.slot_time) : "N/A"}
                    </TableCell>
                    <TableCell>
                      {booking.sub_time_slots?.description || 
                       (booking.sub_time_slots?.slot_number 
                         ? `Slot ${booking.sub_time_slots.slot_number}`
                         : "-")}
                    </TableCell>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/all-booking-details/${booking.id}`)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
  );
}
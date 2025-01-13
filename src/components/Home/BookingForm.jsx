// src/components/BookingForm.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, AlertCircle } from "lucide-react";

export default function BookingForm({ booking, onSave, onCancel ,onSuccess }) {
  // Determine if we are editing an existing booking
  const isEditing = Boolean(booking);

  // State variables
  const [customerName, setCustomerName] = useState(booking?.customer_name || "");
  const [contactNumber, setContactNumber] = useState(booking?.contact_number || "");
  const [dogName, setDogName] = useState(booking?.dog_name || "");
  const [dogBreed, setDogBreed] = useState(booking?.dog_breed || "");
  const [dogSize, setDogSize] = useState(booking?.dog_size || "");
  
  // Initialize bookingDate: if editing, use booking_date, else null
  const initialDate = booking?.booking_date ? new Date(booking.booking_date) : null;
  const [bookingDate, setBookingDate] = useState(initialDate);
  
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(booking?.time_slot_id || "");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (bookingDate) {
      fetchAvailableSlots();
    }
  }, [bookingDate]);

  async function fetchAvailableSlots() {
    if (!bookingDate) return;
  
    setLoadingSlots(true);
  
    const formattedDate = format(bookingDate, "yyyy-MM-dd");
  
    // Fetch all time slots
    const { data: allSlots, error: slotsError } = await supabase
      .from("time_slots")
      .select("*");
  
    if (slotsError) {
      toast.error(`Error fetching slots: ${slotsError.message}`);
      setLoadingSlots(false);
      return;
    }
  
    // Fetch bookings for the selected date
    const { data: bookingsOnDate, error: bookingsError } = await supabase
      .from("bookings")
      .select("time_slot_id")
      .eq("booking_date", formattedDate);
  
    if (bookingsError) {
      toast.error(`Error fetching bookings: ${bookingsError.message}`);
      setLoadingSlots(false);
      return;
    }
  
    const bookedSlotIds = bookingsOnDate.map((booking) => booking.time_slot_id);
    const available = allSlots.filter(
      (slot) => !bookedSlotIds.includes(slot.id)
    );
  
    setAvailableSlots(available);
    setLoadingSlots(false);
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
  
    const formattedDate = bookingDate ? format(bookingDate, "yyyy-MM-dd") : null;
  
    if (isEditing) {
      // ... existing update logic
    } else {
      // For new booking creation, first fetch the time slot details
      let slotTime = null;
      if (selectedSlot) {
        const { data: timeSlotData, error: timeSlotError } = await supabase
          .from('time_slots')
          .select('start_time')
          .eq('id', selectedSlot)
          .single();
  
        if (timeSlotError) {
          toast.error(`Error fetching time slot: ${timeSlotError.message}`);
          setSubmitting(false);
          return;
        }
        slotTime = timeSlotData.start_time;
      }
  
      // Insert new booking with slot_time
      const { error } = await supabase.from("bookings").insert([
        {
          customer_name: customerName,
          contact_number: contactNumber,
          dog_name: dogName,
          dog_breed: dogBreed,
          dog_size: dogSize,
          booking_date: formattedDate,
          time_slot_id: selectedSlot,
          slot_time: slotTime,  // Store the time directly in the booking
        },
      ]);
  
      setSubmitting(false);
  
      if (error) {
        toast.error(`Error creating booking: ${error.message}`);
      } else {
        toast.success("Booking created successfully!");
        // Clear form fields
        setCustomerName("");
        setContactNumber("");
        setDogName("");
        setDogBreed("");
        setDogSize("");
        setBookingDate(null);
        setSelectedSlot("");
        if (onSave) onSave();
      }
    }
  };
  

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Booking" : "New Booking"}</CardTitle>
        <CardDescription>
          {isEditing
            ? "Update your dog grooming appointment details"
            : "Schedule a new dog grooming appointment"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Customer and dog details fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dogName">Dog Name</Label>
              <Input
                id="dogName"
                value={dogName}
                onChange={(e) => setDogName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dogBreed">Dog Breed</Label>
              <Input
                id="dogBreed"
                value={dogBreed}
                onChange={(e) => setDogBreed(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dogSize">Dog Size</Label>
              <Select value={dogSize} onValueChange={setDogSize} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Booking Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !bookingDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {bookingDate
                    ? format(bookingDate, "PPP")
                    : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={bookingDate}
                  onSelect={setBookingDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          {bookingDate && (
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Select Time Slot</Label>
              {loadingSlots ? (
                <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-gray-600">
                    Loading available slots...
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {availableSlots.length === 0 ? (
                    <div className="col-span-full p-6 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="text-yellow-800 font-semibold text-center flex items-center justify-center space-x-3">
                        <AlertCircle className="h-6 w-6 text-yellow-700" />
                        <span>No available slots for this date.</span>
                      </p>
                    </div>
                  ) : (
                    availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`p-4 h-24 rounded-lg border transition-all duration-300 ease-in-out transform ${
                          selectedSlot === slot.id
                            ? "bg-green-500 text-white scale-105 shadow-lg shadow-green-300 border-transparent"
                            : "bg-white text-gray-800 hover:bg-gray-100"
                        } ${
                          selectedSlot === slot.id
                            ? "border-2 border-green-500"
                            : "border border-gray-300"
                        }`}
                      >
                        <p className="font-semibold text-lg">
                          {slot.start_time.split(":").slice(0, 2).join(":")}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Updating Booking..." : "Creating Booking..."}
              </>
            ) : (
              isEditing ? "Save Changes" : "Create Booking"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// src/components/Home/BookingForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import {
  Card,
  CardTitle,
  CardContent,
  CardHeader,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfToday } from "date-fns";
import { CalendarIcon, Loader2, AlertCircle, CheckCircle,

  PawPrintIcon as Paw,

  Clock,
  Phone,
  User,
  DogIcon,
 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // For animations
import { Progress } from "@/components/ui/progress"; // Updated import
export default function BookingForm({ booking, onSave, onCancel, onSuccess }) {
  const isEditing = Boolean(booking);

  // Step management: Now 3 steps
  const [step, setStep] = useState(1);

  // Step 1: Booking Date, Time Slot, Sub-Time Slot
  const [bookingDate, setBookingDate] = useState(
    booking?.booking_date ? new Date(booking.booking_date) : null
  );

  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  const [availableSubSlots, setAvailableSubSlots] = useState([]);
  const [selectedSubSlot, setSelectedSubSlot] = useState(booking?.sub_time_slot_id || "");
  const [loadingSubSlots, setLoadingSubSlots] = useState(false);

  // Step 2: Booking Details
  const [customerName, setCustomerName] = useState(booking?.customer_name || "");
  const [contactNumber, setContactNumber] = useState(booking?.contact_number || "");
  const [dogName, setDogName] = useState(booking?.dog_name || "");
  const [dogBreed, setDogBreed] = useState(booking?.dog_breed || "");

  // Loading and submitting states
  const [submitting, setSubmitting] = useState(false);

  // Popover control
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef();

  // Fetch available time slots based on selected date
  useEffect(() => {
    if (bookingDate) {
      fetchAvailableTimeSlots();
    } else {
      setAvailableTimeSlots([]);
      setSelectedTimeSlot("");
      setAvailableSubSlots([]);
      setSelectedSubSlot("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingDate]);

  // Fetch available sub-time slots based on selected time slot and date
  useEffect(() => {
    if (selectedTimeSlot && bookingDate) {
      fetchAvailableSubSlots();
    } else {
      setAvailableSubSlots([]);
      setSelectedSubSlot("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimeSlot, bookingDate]);

  // Function to fetch available time slots for the selected date
  const fetchAvailableTimeSlots = async () => {
    setLoadingTimeSlots(true);
    const dayOfWeek = format(bookingDate, "EEEE"); // e.g., "Monday"

    // Fetch time_slots that are active on the selected day
    const { data: timeSlots, error } = await supabase
      .from("time_slots")
      .select(`
        id,
        start_time
      `)
      .or(`repeat_all_days.eq.true,specific_days.cs.{${dayOfWeek}}`)
      .order("start_time", { ascending: true });

    if (error) {
      toast.error(`Error fetching time slots: ${error.message}`);
      setLoadingTimeSlots(false);
      return;
    }

    setAvailableTimeSlots(timeSlots || []);
    setLoadingTimeSlots(false);
  };

  // Function to fetch available sub-time slots based on selected time slot and date
  const fetchAvailableSubSlots = async () => {
    setLoadingSubSlots(true);
    const formattedDate = format(bookingDate, "yyyy-MM-dd");

    // Fetch bookings on the selected date to determine availability
    const { data: bookingsOnDate, error: bookingsError } = await supabase
      .from("bookings")
      .select("sub_time_slot_id")
      .eq("booking_date", formattedDate);

    if (bookingsError) {
      toast.error(`Error fetching bookings: ${bookingsError.message}`);
      setLoadingSubSlots(false);
      return;
    }

    const bookedSubSlotIds = bookingsOnDate
      .map((b) => b.sub_time_slot_id)
      .filter((id) => id !== null);

    // Fetch sub_time_slots for the selected time slot
    const { data: subSlotsData, error: subSlotsError } = await supabase
      .from("sub_time_slots")
      .select(`id, slot_number, description`)
      .eq("time_slot_id", selectedTimeSlot)
      .order("slot_number", { ascending: true });

    if (subSlotsError) {
      toast.error(`Error fetching sub-time slots: ${subSlotsError.message}`);
      setLoadingSubSlots(false);
      return;
    }

    // Filter out already booked sub-time slots
    const available = subSlotsData.filter(
      (sub) => !bookedSubSlotIds.includes(sub.id)
    );

    setAvailableSubSlots(available);
    setLoadingSubSlots(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const formattedDate = bookingDate ? format(bookingDate, "yyyy-MM-dd") : null;

    if (step === 1) {
      // Validate Step 1 selections before proceeding
      if (!bookingDate) {
        toast.error("Please select a booking date.");
        setSubmitting(false);
        return;
      }
      if (!selectedTimeSlot) {
        toast.error("Please select a time slot.");
        setSubmitting(false);
        return;
      }
      if (!selectedSubSlot) {
     
        setSubmitting(false);
        return;
      }

      // Proceed to next step
      setStep(2);
      setSubmitting(false);
      return;
    }

    if (step === 2) {
      // Validate Step 2 inputs
      if (!customerName || !contactNumber || !dogName || !dogBreed) {
        toast.error("Please fill in all the booking details.");
        setSubmitting(false);
        return;
      }

      // Proceed to summary step
      setStep(3);
      setSubmitting(false);
      return;
    }

    if (step === 3) {
      // Final submission for booking
      try {
        // Fetch the start_time from the selected sub_time_slot
        const { data: subSlotData, error: subSlotError } = await supabase
          .from("sub_time_slots")
          .select(`
            id,
            time_slot_id,
            time_slots (
              start_time
            )
          `)
          .eq("id", selectedSubSlot)
          .single();

        if (subSlotError) {
          toast.error(`Error fetching sub-time slot details: ${subSlotError.message}`);
          setSubmitting(false);
          return;
        }

        const slotTime = subSlotData.time_slots.start_time; // "HH:MM:SS"

        if (isEditing) {
          // Update existing booking
          const { error } = await supabase
            .from("bookings")
            .update({
              customer_name: customerName,
              contact_number: contactNumber,
              dog_name: dogName,
              dog_breed: dogBreed,
              booking_date: formattedDate,
              sub_time_slot_id: selectedSubSlot,
              slot_time: slotTime,
              // Status remains unchanged or can be updated based on your logic
            })
            .eq("id", booking.id);

          if (error) throw error;

          toast.success("Booking updated successfully!");
          setSubmitting(false);
          if (onSuccess) {
            // Ensure we call onSuccess after the toast
            setTimeout(() => {
              onSuccess();
            }, 100);
          }
        } else {
          // Create new booking
          const { error } = await supabase.from("bookings").insert([
            {
              customer_name: customerName,
              contact_number: contactNumber,
              dog_name: dogName,
              dog_breed: dogBreed,
              booking_date: formattedDate,
              sub_time_slot_id: selectedSubSlot,
              slot_time: slotTime,
              // Status defaults to 'reserved' as per table schema
            },
          ]);

          if (error) throw error;

          toast.success("Booking created successfully!");
          setSubmitting(false);
          if (onSuccess) {
            // Ensure we call onSuccess after the toast
            setTimeout(() => {
              onSuccess();
            }, 100);
          }
        }
      } catch (error) {
        toast.error(`Error creating/updating booking: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Function to format time in IST
  const formatTimeIST = (timeStr) => {
    // Assuming timeStr is in "HH:mm:ss" format (24-hour)
    const [hours, minutes, seconds] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds);

    // Format in IST
    return format(date, "hh:mm a");
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    return (step / 3) * 100;
  };

  // Render content based on the current step
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Booking Date */}
            <div className="space-y-2">
              <Label htmlFor="bookingDate">Booking Date</Label>
              <Popover
                open={isPopoverOpen}
                onOpenChange={(open) => setIsPopoverOpen(open)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !bookingDate && "text-muted-foreground"
                    )}
                    aria-label="Select booking date"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {bookingDate
                      ? format(bookingDate, "PPP")
                      : <span className="text-gray-500">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={(date) => {
                      setBookingDate(date);
                      // Reset selections when date changes
                      setSelectedTimeSlot("");
                      setSelectedSubSlot("");
                      setAvailableSubSlots([]);
                      setIsPopoverOpen(false); // Close the popover after selecting a date
                    }}
                    initialFocus
                    disabled={(date) => isBefore(date, startOfToday())} // Disable past dates
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Slot Selection */}
            {bookingDate && (
              <div className="space-y-4">
                <Label>Select Time Slot</Label>
                {loadingTimeSlots ? (
                  <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading time slots" />
                    <span className="ml-2 text-sm text-gray-600">
                      Loading available time slots...
                    </span>
                  </div>
                ) : availableTimeSlots.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg flex items-center">
                    <AlertCircle className="h-6 w-6 text-yellow-700 mr-2" />
                    <span className="text-yellow-800 font-semibold">
                      No available time slots for this date.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTimeSlots.map((timeSlot) => (
                      <Button
                        key={timeSlot.id}
                        variant={selectedTimeSlot === timeSlot.id ? "primary" : "outline"}
                        onClick={() => {
                          setSelectedTimeSlot(timeSlot.id);
                          // Reset sub-time slot selection when time slot changes
                          setSelectedSubSlot("");
                        }}
                        className="py-3 px-5 text-lg"
                        aria-pressed={selectedTimeSlot === timeSlot.id}
                        aria-label={`Select time slot at ${formatTimeIST(timeSlot.start_time)}`}
                      >
                        {formatTimeIST(timeSlot.start_time)}
                        {selectedTimeSlot === timeSlot.id && <CheckCircle className="ml-2 h-5 w-5 text-green-500" />}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Time Slot Selection */}
            {selectedTimeSlot && (
              <div className="space-y-4">
                <Label>Select Sub-Time Slot</Label>
                {loadingSubSlots ? (
                  <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading sub-time slots" />
                    <span className="ml-2 text-sm text-gray-600">
                      Loading available sub-time slots...
                    </span>
                  </div>
                ) : availableSubSlots.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg flex items-center">
                    <AlertCircle className="h-6 w-6 text-yellow-700 mr-2" />
                    <span className="text-yellow-800 font-semibold">
                      No available sub-time slots for this time slot.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSubSlots.map((subSlot) => (
                      <Button
                        key={subSlot.id}
                        variant={selectedSubSlot === subSlot.id ? "primary" : "outline"}
                        onClick={() => {
                          setSelectedSubSlot(subSlot.id);
                        }}
                        className="py-3 px-5 text-lg"
                        aria-pressed={selectedSubSlot === subSlot.id}
                        aria-label={`Select sub-time slot ${subSlot.description || `Slot ${subSlot.slot_number}`}`}
                      >
                        {subSlot.description ? subSlot.description : `Slot ${subSlot.slot_number}`}
                        {selectedSubSlot === subSlot.id && <CheckCircle className="ml-2 h-5 w-5 text-green-500" />}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <div className="">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                aria-required="true"
                aria-label="Customer Name"
              />
            </div>
            <div className="">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
                aria-required="true"
                aria-label="Contact Number"
                type="tel"
                pattern="[0-9]{10}"
                placeholder="e.g., 9876543210"
              />
            </div>
            <div className="">
              <Label htmlFor="dogName">Dog Name</Label>
              <Input
                id="dogName"
                value={dogName}
                onChange={(e) => setDogName(e.target.value)}
                required
                aria-required="true"
                aria-label="Dog Name"
              />
            </div>
            <div className="">
              <Label htmlFor="dogBreed">Dog Breed</Label>
              <Input
                id="dogBreed"
                value={dogBreed}
                onChange={(e) => setDogBreed(e.target.value)}
                required
                aria-required="true"
                aria-label="Dog Breed"
              />
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Label className="text-xl font-semibold">Booking Summary</Label>
            <div className="space-y-4">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-primary mr-2" />
                <span className="text-md">
                  <strong>Date:</strong> {bookingDate ? format(bookingDate, "PPP") : "N/A"}
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-primary mr-2" />
                <span className="text-md">
                  <strong>Time Slot:</strong> {selectedTimeSlot ? formatTimeIST(availableTimeSlots.find(ts => ts.id === selectedTimeSlot)?.start_time) : "N/A"}
                </span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-primary mr-2" />
                <span className="text-md">
                  <strong>Sub-Time Slot:</strong> {selectedSubSlot ? (availableSubSlots.find(ss => ss.id === selectedSubSlot)?.description || `Slot ${availableSubSlots.find(ss => ss.id === selectedSubSlot)?.slot_number}`) : "N/A"}
                </span>
              </div>
              <div className="flex items-center">
                <User className="h-5 w-5 text-primary mr-2" />
                <span className="text-md">
                  <strong>Customer Name:</strong> {customerName}
                </span>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-primary mr-2" />
                <span className="text-md">
                  <strong>Contact Number:</strong> {contactNumber}
                </span>
              </div>
              <div className="flex items-center">
                <DogIcon className="h-5 w-5 text-primary mr-2" />
                <span className="text-md">
                  <strong>Dog Name:</strong> {dogName}
                </span>
              </div>
              <div className="flex items-center">
                <Paw className="h-5 w-5 text-primary mr-2" />
                <span className="text-md">
                  <strong>Dog Breed:</strong> {dogBreed}
                </span>
              </div>
              {/* Optional: Add more details or a summary of selected services */}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-6xl  ">
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          {isEditing ? "Update Booking" : "Create Booking"}
        </CardTitle>
        <CardDescription className="text-sm">
          {isEditing
            ? "Update your dog grooming appointment details"
            : "Schedule a new dog grooming appointment"}
        </CardDescription>
        {/* Progress Indicator */}
        <div className="mt-4">
          <Progress value={calculateProgress()} aria-label={`Progress: Step ${step} of 3`} />
          <span className="text-sm text-gray-600 mt-1 block">Step {step} of 3</span>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <AnimatePresence mode="wait"> {/* Updated mode from 'exitBeforeEnter' to 'wait' */}
            {renderStepContent()}
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          {step > 1 && (
            <Button
              type="button" // Ensure type is "button" to prevent form submission
              variant="outline"
              onClick={() => setStep(step - 1)}
              aria-label="Go to previous step"
            >
              Back
            </Button>
          )}
          {step < 3 && (
            <Button
              type="button" // Ensure type is "button" to prevent form submission

              onClick={(e) => {
                e.preventDefault();
                // Handle step transitions with validation
                if (step === 1) {
                  if (!bookingDate) {
                    toast.error("Please select a booking date.");
                    return;
                  }
                  if (!selectedTimeSlot) {
                    toast.error("Please select a time slot.");
                    return;
                  }
                  if (!selectedSubSlot) {
                 
                    return;
                  }
                }
                if (step === 2) {
                  if (!customerName || !contactNumber || !dogName || !dogBreed) {
                    toast.error("Please fill in all the booking details.");
                    return;
                  }
                }
                setStep(step + 1);
              }}
              disabled={
                (step === 1 &&
                  (!bookingDate ||
                    !selectedTimeSlot ||
                    !selectedSubSlot ||
                    loadingTimeSlots ||
                    loadingSubSlots ||
                    submitting)) ||
                (step === 2 &&
                  (!customerName ||
                    !contactNumber ||
                    !dogName ||
                    !dogBreed ||
                    submitting))
              }
              aria-label="Proceed to next step"
            >
              Next
            </Button>
          )}
          {step === 3 && (
            <Button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto"
              aria-label="Confirm booking"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditing ? "Save Changes" : "Confirm Booking"
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}


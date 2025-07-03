import React, { useState, useEffect } from "react";
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
import {
  CalendarIcon,
  Loader2,
  AlertCircle,
  PawPrintIcon as Paw,
  Clock,
  Phone,
  User,
  DogIcon,
  Store,
  Check ,ChevronLeft ,ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import Lottie from "lottie-react";
import greenTickAnimation from "../../assets/greenTick.json"
import { sendWhatsAppConfirmation } from "../../services/twilioService";
import { useParams } from "react-router-dom";

export default function UserBookingForm() {
  // Get businessId from URL parameters
  const { businessId } = useParams();
  
  // State for organization_id
  const [organizationId, setOrganizationId] = useState(null);

  // Step management: 5 steps (including summary)
  const [step, setStep] = useState(1);

  // Step 1: Booking Date
  const [bookingDate, setBookingDate] = useState(null);

  // Step 2: Shop Selection
  const [availableShops, setAvailableShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [loadingShops, setLoadingShops] = useState(false);

  // Step 3: Time Slot, Sub-Time Slot
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  const [availableSubSlots, setAvailableSubSlots] = useState([]);
  const [selectedSubSlot, setSelectedSubSlot] = useState("");
  const [loadingSubSlots, setLoadingSubSlots] = useState(false);

  // Step 4: Booking Details
  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [dogName, setDogName] = useState("");
  const [dogBreed, setDogBreed] = useState("");

  // Loading and submitting states
  const [submitting, setSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingReference, setBookingReference] = useState("");

  // Popover control
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Get organization_id from businessId parameter
  useEffect(() => {
    if (businessId) {
      setOrganizationId(businessId);
    }
  }, [businessId]);

  // Fetch available shops when date is selected
  useEffect(() => {
    if (bookingDate) {
      fetchAvailableShops();
      // Auto-advance to shop selection step
      setStep(2);
    } else {
      setAvailableShops([]);
      setSelectedShop("");
      setAvailableTimeSlots([]);
      setSelectedTimeSlot("");
      setAvailableSubSlots([]);
      setSelectedSubSlot("");
    }
  }, [bookingDate]);

  // Fetch available time slots based on selected shop and date
  useEffect(() => {
    if (selectedShop && bookingDate) {
      fetchAvailableTimeSlots();
      // Auto-advance to time slot selection step
      setStep(3);
    } else {
      setAvailableTimeSlots([]);
      setSelectedTimeSlot("");
      setAvailableSubSlots([]);
      setSelectedSubSlot("");
    }
  }, [selectedShop, bookingDate]);

  // Fetch available sub-time slots based on selected time slot and date
  useEffect(() => {
    if (selectedTimeSlot && bookingDate) {
      fetchAvailableSubSlots();
    } else {
      setAvailableSubSlots([]);
      setSelectedSubSlot("");
    }
  }, [selectedTimeSlot, bookingDate]);

  // Auto-advance to customer details when sub-slot is selected
  useEffect(() => {
    if (selectedSubSlot) {
      // Short delay to show the selection before advancing
      const timer = setTimeout(() => {
        setStep(4);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedSubSlot]);

  // Check if customer details are complete to show auto-advance indicator
  const isCustomerDetailsComplete = () => {
    return customerName && contactNumber && dogName && dogBreed;
  };

  // Function to fetch available shops
  const fetchAvailableShops = async () => {
    setLoadingShops(true);

    try {
      let query = supabase
        .from("shops")
        .select("id, name, badge")
        .order("name", { ascending: true });

      // If businessId is provided, filter shops by organization_id
      if (businessId) {
        query = query.eq("organization_id", businessId);
      }

      const { data: shops, error } = await query;

      if (error) {
        throw error;
      }

      setAvailableShops(shops || []);
      
      // If there's only one shop and we're filtering by businessId, auto-select it
      if (businessId && shops && shops.length === 1) {
        setSelectedShop(shops[0].id);
      }
    } catch (error) {
      toast.error(`Error fetching shops: ${error.message}`);
    } finally {
      setLoadingShops(false);
    }
  };

  // Function to fetch available time slots for the selected date and shop
  const fetchAvailableTimeSlots = async () => {
    setLoadingTimeSlots(true);
    const dayOfWeek = format(bookingDate, "EEEE"); // e.g., "Monday"

    try {
      // Fetch time_slots that are active on the selected day and associated with the selected shop
      const { data: timeSlots, error } = await supabase
        .from("time_slots")
        .select(`
          id,
          start_time,
          repeat_all_days,
          specific_days
        `)
        .contains('shop_ids', [selectedShop])
        .order("start_time", { ascending: true });

      if (error) {
        throw error;
      }

      // Filter time slots based on availability for the selected day
      const availableSlots = timeSlots?.filter(slot => {
        // Check if the slot is available for all days
        if (slot.repeat_all_days) return true;
        
        // Check if the slot is available for the specific day
        if (slot.specific_days && Array.isArray(slot.specific_days)) {
          return slot.specific_days.includes(dayOfWeek);
        }
        
        return false;
      }) || [];

      setAvailableTimeSlots(availableSlots);
      // Clear sub-slot state when time slots are updated
      setSelectedTimeSlot("");
      setSelectedSubSlot("");
      setAvailableSubSlots([]);
    } catch (error) {
      toast.error(`Error fetching time slots: ${error.message}`);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  // Function to fetch available sub-time slots based on selected time slot and date
  const fetchAvailableSubSlots = async () => {
    setLoadingSubSlots(true);
    const formattedDate = format(bookingDate, "yyyy-MM-dd");

    try {
      // Fetch bookings on the selected date to determine availability
      const { data: bookingsOnDate, error: bookingsError } = await supabase
        .from("bookings")
        .select("sub_time_slot_id, status")
        .eq("booking_date", formattedDate)
        .eq("shop_id", selectedShop)
        .neq("status", "cancelled");

      if (bookingsError) {
        throw bookingsError;
      }

      // Filter out sub_time_slot_ids from non-cancelled bookings
      const bookedSubSlotIds = bookingsOnDate
        .filter(b => b.status !== "cancelled")
        .map((b) => b.sub_time_slot_id)
        .filter((id) => id !== null);

      // Fetch sub_time_slots for the selected time slot
      const { data: subSlotsData, error: subSlotsError } = await supabase
        .from("sub_time_slots")
        .select(`id, slot_number, description`)
        .eq("time_slot_id", selectedTimeSlot)
        .order("slot_number", { ascending: true });

      if (subSlotsError) {
        throw subSlotsError;
      }

      // Filter out already booked sub-time slots
      const available = subSlotsData.filter(
        (sub) => !bookedSubSlotIds.includes(sub.id)
      );

      setAvailableSubSlots(available);
      // Removed auto-selection when only one sub-slot is available.
    } catch (error) {
      toast.error(`Error fetching sub-time slots: ${error.message}`);
    } finally {
      setLoadingSubSlots(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // For the final step, validate and submit the form
    if (step === 5) {
      setSubmitting(true);
      const formattedDate = format(bookingDate, "yyyy-MM-dd");
  
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
          throw subSlotError;
        }
  
        const slotTime = subSlotData.time_slots.start_time;
  
        // Get shop name from selected shop
        const { data: shopData, error: shopError } = await supabase
          .from("shops")
          .select("name")
          .eq("id", selectedShop)
          .single();

        if (shopError) {
          console.error("Error fetching shop name:", shopError);
        }

        // Get time slot name (using start_time as the name)
        const { data: timeSlotData, error: timeSlotError } = await supabase
          .from("time_slots")
          .select("start_time")
          .eq("id", subSlotData.time_slot_id)
          .single();

        if (timeSlotError) {
          console.error("Error fetching time slot name:", timeSlotError);
        }

        // Get sub slot name (using description or slot_number)
        const { data: subSlotDetails, error: subSlotDetailsError } = await supabase
          .from("sub_time_slots")
          .select("description, slot_number")
          .eq("id", selectedSubSlot)
          .single();

        if (subSlotDetailsError) {
          console.error("Error fetching sub slot details:", subSlotDetailsError);
        }

        // Create new booking
        const { data, error } = await supabase.from("bookings").insert([
          {
            customer_name: customerName,
            contact_number: contactNumber,
            dog_name: dogName,
            dog_breed: dogBreed,
            booking_date: formattedDate,
            sub_time_slot_id: selectedSubSlot,
            slot_time: slotTime,
            shop_id: selectedShop,
            shop_name: shopData?.name || null,
            time_slot_name: timeSlotData?.start_time ? formatTimeIST(timeSlotData.start_time) : null,
            sub_slot_name: subSlotDetails?.description || `Slot ${subSlotDetails?.slot_number}` || null,
            organization_id: businessId, // Use businessId as organization_id
            status: "reserved" // Default status
          },
        ]).select();
  
        if (error) {
          throw error;
        }
  
        // Set booking reference and show success
        if (data && data.length > 0) {
          setBookingReference(data[0].id);
          
          // Get the shop details for the WhatsApp notification
          const { data: shopData, error: shopError } = await supabase
            .from("shops")
            .select("name, directions, phone_number, badge")
            .eq("id", selectedShop)
            .single();
            
          if (shopError) {
            console.error("Error fetching shop details:", shopError);
          } else {
            // Send WhatsApp notification
            try {
              const bookingData = {
                ...data[0],
                slot_time: formatTimeIST(slotTime)
              };
              
              // await sendWhatsAppConfirmation(bookingData, shopData);
               
               console.log("WhatsApp notification sent successfully");
            } catch (whatsappError) {
              console.error("Failed to send WhatsApp notification:", whatsappError);
              // Continue with the booking process even if WhatsApp notification fails
            }
          }
          
          setBookingComplete(true);
          toast.success("Your booking has been confirmed!");
        }
      } catch (error) {
        toast.error(`Error creating booking: ${error.message}`);
      } finally {
        setSubmitting(false);
      }
    } else {
      // For other steps, validate and proceed to next step
      if (step === 1 && !bookingDate) {
        toast.error("Please select a booking date.");
        return;
      } else if (step === 2 && !selectedShop) {
        toast.error("Please select a shop.");
        return;
      } else if (step === 3 && (!selectedTimeSlot || !selectedSubSlot)) {
        return;
      } else if (step === 4) {
        // Validate form inputs before proceeding to summary
        if (!customerName || !contactNumber || !dogName || !dogBreed) {
          toast.error("Please fill in all the booking details.");
          return;
        }
      }
  
      // Move to next step
      setStep(step + 1);
    }
  };

  // Function to format time in IST
  const formatTimeIST = (timeStr) => {
    // Assuming timeStr is in "HH:mm:ss" format (24-hour)
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);

    // Format in 12-hour with AM/PM
    return format(date, "hh:mm a");
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    return (step / 5) * 100;
  };

  // Reset the form to initial state
  const resetForm = () => {
    setStep(1);
    setBookingDate(null);
    setSelectedShop("");
    setSelectedTimeSlot("");
    setSelectedSubSlot("");
    setCustomerName("");
    setContactNumber("");
    setDogName("");
    setDogBreed("");
    setBookingComplete(false);
    setBookingReference("");
  };

  // Get selected shop details
  const getSelectedShopDetails = () => {
    return availableShops.find((shop) => shop.id === selectedShop) || {};
  };

  // Booking confirmation animation variants
  const tickVariants = {
    initial: { y: 0, scale: 1 },
    animate: { y: -100, scale: 0.5, transition: { delay: 4, duration: 1 } },
  };
  

  const detailsVariants = {
    initial: { opacity: 0, y: 100 },
    animate: { opacity: 1, y: 0, transition: { duration: 1, delay: 0.5 } },
  };

  // When booking is complete, show full-screen confirmation with animation.
  if (bookingComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        {/* Animated Lottie Tick */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={tickVariants}
          className="flex justify-center pt-44 md:pt-60"
        >
        <Lottie
  animationData={greenTickAnimation}
  loop={false}
  autoplay={true}
  className="w-[30rem] -mt-20 md:-mt-50" // Increased from w-60/w-72
/>
        </motion.div>
        {/* Animated Booking Details */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1, delay: 4.5 } }}
          className="absolute bottom-0 w-full flex justify-center pb-10 px-4"
        >
          <Card className="w-full max-w-lg">
            <CardHeader className="bg-green-50">
            <CardTitle className="text-center text-3xl font-bold text-green-800">
                  Booking Confirmed!
                </CardTitle>
                <CardDescription className="text-center text-lg text-green-700">
                  Your appointment has been successfully booked.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
            
              <div className="space-y-4">
                <h3 className="font-semibold">Appointment Details</h3>

                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-primary mr-2" />
                  <span>
                    <strong>Date:</strong>{" "}
                    {bookingDate ? format(bookingDate, "PPP") : "N/A"}
                  </span>
                </div>

                <div className="flex items-center">
                  <Store className="h-5 w-5 text-primary mr-2" />
                  <span>
                    <strong>Shop:</strong>{" "}
                    {getSelectedShopDetails().name || "N/A"}
                    {getSelectedShopDetails().badge &&
                      ` (${getSelectedShopDetails().badge})`}
                  </span>
                </div>

                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-primary mr-2" />
                  <span>
                    <strong>Time:</strong>{" "}
                    {selectedTimeSlot
                      ? formatTimeIST(
                          availableTimeSlots.find(
                            (ts) => ts.id === selectedTimeSlot
                          )?.start_time
                        )
                      : "N/A"}
                  </span>
                </div>

                <div className="flex items-center">
                  <DogIcon className="h-5 w-5 text-primary mr-2" />
                  <span>
                    <strong>Dog:</strong> {dogName} ({dogBreed})
                  </span>
                </div>

                <div className="flex items-center">
                  <User className="h-5 w-5 text-primary mr-2" />
                  <span>
                    <strong>Customer:</strong> {customerName}
                  </span>
                </div>

                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-primary mr-2" />
                  <span>
                    <strong>Contact:</strong> {contactNumber}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={resetForm} variant="outline">
                Book Another Appointment
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Render the booking form steps
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Booking Date */}
            <div className="space-y-4 ">
              <div className="text-center mb-4">
                <h2 className="text-base sm:text-lg font-medium">
                  When would you like to book?
                </h2>
                <p className="text-sm sm:text-base text-gray-500">
                  Select a date for your dog's grooming session
                </p>
              </div>

              <Popover
                open={isPopoverOpen}
                onOpenChange={(open) => setIsPopoverOpen(open)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal py-6",
                      !bookingDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {bookingDate ? format(bookingDate, "PPP") : <span>Choose a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={(date) => {
                      if (date !== bookingDate) {
                        setBookingDate(date);
                        setSelectedShop("");
                        setSelectedTimeSlot("");
                        setSelectedSubSlot("");
                        setAvailableTimeSlots([]);
                        setAvailableSubSlots([]);
                      }
                      setIsPopoverOpen(false);
                    }}
                    initialFocus
                    disabled={(date) => isBefore(date, startOfToday())}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Shop Selection */}
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-base sm:text-lg font-medium">
                  Select a Grooming Location
                </h2>
                <p className="text-gray-500 text-sm sm:text-base">
                  Choose which of our shops you'd like to visit
                </p>
              </div>

              {loadingShops ? (
                <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-gray-600">
                    Loading available locations...
                  </span>
                </div>
              ) : availableShops.length === 0 ? (
                <div className="p-6 bg-yellow-50 border border-yellow-300 rounded-lg text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-yellow-800 font-medium">
                    No shops available for the selected date.
                  </p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please try selecting a different date.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableShops.map((shop) => (
                    <div
                      key={shop.id}
                      className={`p-4 border rounded-lg cursor-pointer bg-white transition-all hover:shadow-md ${
                        selectedShop === shop.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-gray-200 hover:border-primary/50"
                      }`}
                      onClick={() => {
                        if (selectedShop !== shop.id) {
                          setSelectedShop(shop.id);
                          setSelectedTimeSlot("");
                          setSelectedSubSlot("");
                          setAvailableSubSlots([]);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-semibold text-lg">{shop.name}</span>
                          {shop.badge && (
                            <span className="text-sm text-primary mt-1">
                              {shop.badge}
                            </span>
                          )}
                        </div>
                        {selectedShop === shop.id && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Time Slot Selection */}
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className=" font-medium text-base sm:text-lg">
                  Choose an Appointment Time
                </h2>
                <p className="text-gray-500 text-sm sm:text-base">
                  Select an available time slot for your visit
                </p>
              </div>

              {loadingTimeSlots ? (
                <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-gray-600">
                    Loading available times...
                  </span>
                </div>
              ) : availableTimeSlots.length === 0 ? (
                <div className="p-6 bg-yellow-50 border border-yellow-300 rounded-lg text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-yellow-800 font-medium">
                    No time slots available for the selected date and shop.
                  </p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please try selecting a different date or location.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableTimeSlots.map((timeSlot) => (
                    <Button
                      key={timeSlot.id}
                      variant={
                        selectedTimeSlot === timeSlot.id ? "default" : "outline"
                      }
                      onClick={() => {
                        if (selectedTimeSlot !== timeSlot.id) {
                          setSelectedTimeSlot(timeSlot.id);
                          setSelectedSubSlot("");
                          setAvailableSubSlots([]);
                        }
                      }}
                      className={`py-6 ${
                        selectedTimeSlot === timeSlot.id
                          ? "bg-primary text-white"
                          : ""
                      }`}
                    >
                      {formatTimeIST(timeSlot.start_time)}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-Time Slot Selection */}
            {selectedTimeSlot && (
              <div className="space-y-4 mt-8">
                <div className="text-center mb-2">
                  <h3 className="text-base sm:text-lg font-medium">Select Slot</h3>
                  <p className="text-gray-500 text-sm sm:text-base">
                    Choose an available appointment slot
                  </p>
                </div>

                {loadingSubSlots ? (
                  <div className="flex items-center justify-center h-24 bg-gray-50 rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-gray-600">
                      Loading slots...
                    </span>
                  </div>
                ) : availableSubSlots.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg text-center">
                    <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                    <p className="text-yellow-800 text-sm font-medium">
                      No slots available for this time.
                    </p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Please select a different time.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {availableSubSlots.map((subSlot) => (
                      <Button
                        key={subSlot.id}
                        variant={selectedSubSlot === subSlot.id ? "default" : "outline"}
                        className={`w-full h-auto py-3 px-2 text-xs sm:text-sm whitespace-normal text-center flex items-center justify-center ${selectedSubSlot === subSlot.id ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => setSelectedSubSlot(subSlot.id)}
                      >
                        {subSlot.description}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <h2 className="text-base sm:text-lg font-medium">Your Details</h2>
              <p className="text-gray-500 text-sm sm:text-base">
                Please provide information about you and your dog
              </p>
            </div>

            {/* Customer Details Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Your Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  type="tel"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dogName">Dog's Name</Label>
                <Input
                  id="dogName"
                  value={dogName}
                  onChange={(e) => setDogName(e.target.value)}
                  placeholder="Enter your dog's name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dogBreed">Dog's Breed</Label>
                <Input
                  id="dogBreed"
                  value={dogBreed}
                  onChange={(e) => setDogBreed(e.target.value)}
                  placeholder="Enter your dog's breed"
                  required
                />
              </div>
            </div>

            {isCustomerDetailsComplete() && (
              <div className="mt-2 text-xs sm:text-sm text-center text-gray-500">
                All details complete. Click "Continue" to review your booking.
              </div>
            )}
          </motion.div>
        );

      case 5:
        const selectedShopDetails = getSelectedShopDetails();
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-4">
              <h2 className="text-base sm:text-lg font-medium">Booking Summary</h2>
              <p className="text-gray-500 text-sm sm:text-base">
                Please review your appointment details before confirming
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5">
  <div className="space-y-4 text-sm text-gray-700">
    <div className="flex items-start gap-3">
      <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">Date</p>
        <p className="font-medium">{bookingDate ? format(bookingDate, "PPP") : "N/A"}</p>
      </div>
    </div>

    <div className="flex items-start gap-3">
      <Store className="h-5 w-5 text-primary mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">Location</p>
        <p className="font-medium">
          {selectedShopDetails.name || "N/A"}
          {selectedShopDetails.badge && ` (${selectedShopDetails.badge})`}
        </p>
      </div>
    </div>

    <div className="flex items-start gap-3">
      <Clock className="h-5 w-5 text-primary mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">Time</p>
        <p className="font-medium">
          {selectedTimeSlot
            ? formatTimeIST(
                availableTimeSlots.find((ts) => ts.id === selectedTimeSlot)?.start_time
              )
            : "N/A"}
          {selectedSubSlot &&
            ` - ${
              availableSubSlots.find((ss) => ss.id === selectedSubSlot)?.description ||
              `Slot ${
                availableSubSlots.find((ss) => ss.id === selectedSubSlot)?.slot_number
              }`
            }`}
        </p>
      </div>
    </div>

    <hr className="my-3 border-gray-200" />

    <div className="flex items-start gap-3">
      <User className="h-5 w-5 text-primary mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">Customer</p>
        <p className="font-medium">{customerName}</p>
      </div>
    </div>

    <div className="flex items-start gap-3">
      <Phone className="h-5 w-5 text-primary mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">Contact</p>
        <p className="font-medium">{contactNumber}</p>
      </div>
    </div>

    <div className="flex items-start gap-3">
      <DogIcon className="h-5 w-5 text-primary mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">Dog</p>
        <p className="font-medium">{dogName}</p>
      </div>
    </div>

    <div className="flex items-start gap-3">
      <Paw className="h-5 w-5 text-primary mt-0.5" />
      <div>
        <p className="text-xs text-gray-400">Breed</p>
        <p className="font-medium">{dogBreed}</p>
      </div>
    </div>
  </div>
</div>

          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="mb-4 sm:mb-0 text-center text-xl sm:text-2xl">
            Book a Grooming Appointment
          </CardTitle>
          <CardDescription className="text-center  hidden md:block">
            Schedule a grooming session for your furry friend
          </CardDescription>

          {/* Progress Indicator */}
          <div className="mt-4">
            <Progress value={calculateProgress()} className="h-2 bg-white border border-gray-200" />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">Step {step} of 5</span>
              <span className="text-xs text-gray-500">
                {step === 1
                  ? "Select Date"
                  : step === 2
                  ? "Choose Shop"
                  : step === 3
                  ? "Pick Time"
                  : "Your Details"}
              </span>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="">
            <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
          </CardContent>

          <CardFooter className="flex justify-between pt-4">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft />
                <span className="hidden sm:block">Back</span>
                
              </Button>
            )}

            <Button
              type="submit"
              className={`${step === 1 ? "w-full" : ""} ${
                step === 5 ? "bg-green-600 hover:bg-green-700" : ""
              }`}
              disabled={
                submitting ||
                (step === 1 && !bookingDate) ||
                (step === 2 && !selectedShop) ||
                (step === 3 && (!selectedTimeSlot || !selectedSubSlot)) ||
                (step === 4 && !isCustomerDetailsComplete())
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : step < 5 ? (
                <>
                Continue
                <ChevronRight className="inline h-4 w-4 ml-1" />
              </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Confirm Booking
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

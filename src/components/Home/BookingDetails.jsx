import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { useSwipeable } from "react-swipeable";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Phone,
  DogIcon,
  PawPrintIcon as Paw,
  Calendar,
  Clock,
  Printer,
  Edit2,
  ChevronDown,
  X,
  Maximize,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogOverlay, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StarIcon,Star  } from "lucide-react";

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceInputs, setServiceInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [careTips, setCareTips] = useState({});
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Fetch booking details (including sub_time_slots and selected services)
  const fetchBookingDetails = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          sub_time_slots (
            *,
            time_slots (
              start_time
            )
          ),
          booking_services_selected (
            *,
            services (
              *
            )
          )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      setBooking(data);

      // Initialize selectedServices from booking_services_selected without duplicates
      if (data.booking_services_selected) {
        const uniqueServices = data.booking_services_selected.reduce(
          (acc, curr) => {
            if (!acc.some((s) => s.id === curr.service_id)) {
              acc.push({
                id: curr.service_id,
                name: curr.services.name,
                price: curr.services.price,
                type: curr.services.type,
                input_value: curr.input_value,
                image_url: curr.services.image_url,
                description: curr.services.description,
              });
            }
            return acc;
          },
          []
        );
        setSelectedServices(uniqueServices);

        // Initialize service inputs
        const inputs = {};
        const tips = {};
        data.booking_services_selected.forEach((item) => {
          if (item.input_value) {
            inputs[item.service_id] = item.input_value;
          }
          if (item.care_tip) {
            tips[item.service_id] = item.care_tip;
          }
        });
        setServiceInputs(inputs);
        setCareTips(tips);
      }
    } catch (error) {
      toast.error(`Failed to fetch booking details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch all available services (for editing)
  const fetchAllServices = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("services").select("*");
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      toast.error(`Failed to fetch services: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    fetchBookingDetails();
    fetchAllServices();
  }, [fetchBookingDetails, fetchAllServices]);

  // Subscribe to real-time changes for bookings
  useEffect(() => {
    const channel = supabase
      .channel("public:bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          fetchBookingDetails();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookingDetails]);

  // Handle service selection (for editing)
  const handleServiceSelection = useCallback((service) => {
    setSelectedServices((prev) => {
      if (prev.some((s) => s.id === service.id)) {
        // Remove care tip when unselecting
        setCareTips((prevTips) => {
          const updated = { ...prevTips };
          delete updated[service.id];
          return updated;
        });
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
    if (service.type === "input") {
      setServiceInputs((prev) => {
        const updated = { ...prev };
        if (updated[service.id]) {
          delete updated[service.id];
        }
        return updated;
      });
    }
  }, []);
  
  

  // Handle input change for services of type "input"
  const handleInputChange = useCallback((serviceId, value) => {
    setServiceInputs((prev) => ({
      ...prev,
      [serviceId]: value,
    }));
  }, []);
  
  // Handle care tip input change for selected services
  const handleCareTipChange = useCallback((serviceId, value) => {

    setCareTips((prev) => ({
      ...prev,
      [serviceId]: value,
    }));
  }, []);

  // Handle submission when updating/editing booking services
  const handleSubmit = useCallback(async () => {
    if (selectedServices.length === 0) {
      toast.error("Please select at least one service.");
      return;
    }
    setSubmitting(true);
    try {
      // Delete existing booking_services_selected for this booking
      const { error: deleteError } = await supabase
        .from("booking_services_selected")
        .delete()
        .eq("booking_id", id);
      if (deleteError) throw deleteError;
  
      // Insert new booking_services_selected with updated care_tip mapping
      const bookingServices = selectedServices.map((service) => ({
        booking_id: id,
        service_id: service.id,
        input_value: service.type === "input" ? serviceInputs[service.id] || "" : null,
        care_tip:
          careTips[service.id] && careTips[service.id].trim() !== ""
            ? careTips[service.id]
            : null,
      }));
      
   
      
      const { error: insertError } = await supabase
        .from("booking_services_selected")
        .insert(bookingServices);
      if (insertError) throw insertError;
  
      // Update booking status if necessary
      if (booking.status === "reserved" || booking.status === "checked_in") {
        const { error: updateError } = await supabase
          .from("bookings")
          .update({ status: "progressing" })
          .eq("id", id);
        if (updateError) throw updateError;
      }
  
      toast.success("Booking updated successfully!");
      fetchBookingDetails();
     
    } catch (error) {
      toast.error(`Failed to submit booking: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }, [id, selectedServices, serviceInputs, careTips, booking?.status, fetchBookingDetails]);
  

  // Handle initial submission (for non-edit mode)
  const handleInitialSubmit = useCallback(async () => {
    if (selectedServices.length === 0) {
      toast.error("Please select at least one service.");
      return;
    }
    setSubmitting(true);
    try {
      const bookingServices = selectedServices.map((service) => ({
        booking_id: id,
        service_id: service.id,
        input_value: service.type === "input" ? serviceInputs[service.id] || "" : null,
        care_tip:
          careTips[service.id] && careTips[service.id].trim() !== ""
            ? careTips[service.id]
            : null,
      }));
      
      
      
      const { error: insertError } = await supabase
        .from("booking_services_selected")
        .insert(bookingServices);
      if (insertError) throw insertError;
  
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "progressing" })
        .eq("id", id);
      if (updateError) throw updateError;
  
      toast.success("Booking confirmed successfully!");
      navigate("/home");
    } catch (error) {
      toast.error(`Failed to submit booking: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }, [id, selectedServices, serviceInputs, careTips, navigate]);
  

// Handle marking the booking as completed (check-out) and save to historical_bookings
const handleCompleteBooking = async () => {
  setSubmitting(true);
  try {
    // First, gather all the service data with care tips
    let servicesData = [];
    
    // Get all booking_services_selected for this booking
    const { data: bookingServicesData, error: fetchError } = await supabase
      .from("booking_services_selected")
      .select(`
        id,
        service_id,
        input_value,
        care_tip,
        services (
          name,
          price,
          type,
          description,
          image_url
        )
      `)
      .eq("booking_id", id);
      
    if (fetchError) throw fetchError;
    
    // Format the services data for storage
    servicesData = bookingServicesData.map(item => ({
      id: item.service_id,
      name: item.services.name,
      price: item.services.price,
      type: item.services.type,
      description: item.services.description,
      image_url: item.services.image_url,
      input_value: item.input_value,
      care_tip: item.care_tip
    }));

    // Update any pending care tips first
    if (Object.keys(careTips).length > 0) {
      const serviceRecordMap = {};
      bookingServicesData.forEach(record => {
        serviceRecordMap[record.service_id] = record.id;
      });
      
      const updatePromises = Object.entries(careTips).map(async ([serviceId, careTip]) => {
        // Skip empty care tips
        if (!careTip || careTip.trim() === '') {
          return;
        }
        
        const recordId = serviceRecordMap[serviceId];
        if (!recordId) {
          return;
        }
        
        const { error: updateError } = await supabase
          .from("booking_services_selected")
          .update({ care_tip: careTip })
          .eq("id", recordId);
          
        if (updateError) {
          throw updateError;
        }
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
    }
    
    // Store the booking in historical_bookings
    const { data: historicalData, error: historicalError } = await supabase
      .from("historical_bookings")
      .insert({
        original_booking_id: id,
        customer_name: booking.customer_name,
        contact_number: booking.contact_number,
        dog_name: booking.dog_name,
        dog_breed: booking.dog_breed,
        booking_date: booking.booking_date,
        slot_time: booking.sub_time_slots?.time_slots?.start_time,
        sub_time_slot_id: booking.sub_time_slot_id,
        shop_id: booking.shop_id,
        status: 'completed',
        services: servicesData,
        feedback: null // Will be updated after feedback submission
      })
      .select()
      .single();
    
    if (historicalError) throw historicalError;
    
    // Update original booking status
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", id);
    
    if (error) throw error;
    
    toast.success("Booking marked as COMPLETED!");
    
    // Show feedback dialog after completing
    setShowFeedbackDialog(true);
  } catch (error) {
    toast.error(`Error marking booking as completed: ${error.message}`);
  } finally {
    setSubmitting(false);
  }
};
  
// Handle feedback submission
const handleFeedbackSubmit = async () => {
  setFeedbackSubmitting(true);
  try {
    // Create feedback record in booking_feedback table
    const { data: feedbackData, error } = await supabase
      .from("booking_feedback")
      .insert({
        booking_id: id,
        rating: feedbackRating,
        comment: feedbackComment,
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // Update the historical booking record with feedback information
    const { error: updateError } = await supabase
      .from("historical_bookings")
      .update({
        feedback: {
          rating: feedbackRating,
          comment: feedbackComment,
          created_at: new Date().toISOString()
        }
      })
      .eq("original_booking_id", id);
    
    if (updateError) throw updateError;
    
    toast.success("Thank you for your feedback!");
    // Navigate back to home after feedback submission
    navigate("/home");
  } catch (error) {
    toast.error(`Error submitting feedback: ${error.message}`);
  } finally {
    setFeedbackSubmitting(false);
  }
};
  
  // Skip feedback and go home
  const skipFeedback = () => {
    navigate("/home");
  };

  // Handle printing slip (for customer or groomer)
  const handlePrintSlip = (copyType) => {
    const printWindow = window.open("", "_blank", "width=600,height=600");
    if (printWindow) {
      const slipContent = `
        <html>
          <head>
            <title>Booking Slip - ${copyType}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
              h2 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              .total { font-weight: bold; }
            </style>
          </head>
          <body>
            <h2>Booking Slip - ${copyType.toUpperCase()}</h2>
            <p><strong>Customer Name:</strong> ${booking.customer_name}</p>
            <p><strong>Contact Number:</strong> ${booking.contact_number}</p>
            <p><strong>Dog Name:</strong> ${booking.dog_name}</p>
            <p><strong>Dog Breed:</strong> ${booking.dog_breed}</p>
            <p><strong>Booking Date:</strong> ${format(new Date(booking.booking_date), "PPP")}</p>
            <p><strong>Time Slot:</strong> ${
              booking.sub_time_slots?.time_slots?.start_time
                ? format(parse(booking.sub_time_slots.time_slots.start_time, "HH:mm:ss", new Date()), "hh:mm a")
                : "N/A"
            }</p>
            <p><strong>Sub-Time Slot:</strong> ${
              booking.sub_time_slots?.description ||
              `Slot ${booking.sub_time_slots?.slot_number}` ||
              "N/A"
            }</p>
            <h3>Services:</h3>
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${selectedServices
                  .map(
                    (service) => `
                  <tr>
                    <td>${service.name}${
                      service.type === "input"
                        ? " (" + (serviceInputs[service.id] || "") + ")"
                        : ""
                    }</td>
                    <td>₹${service.price}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(slipContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Open fullscreen image modal with index tracking
  const openFullscreenImage = (imageUrl, serviceName) => {
    // Find all services with images
    const servicesWithImages = services.filter(service => service.image_url);
    // Find the index of the current service
    const currentIndex = servicesWithImages.findIndex(service => service.image_url === imageUrl);
    
    setFullscreenImage({ 
      url: imageUrl, 
      name: serviceName,
      currentIndex,
      allServices: servicesWithImages
    });
  };

  // Close fullscreen image modal
  const closeFullscreenImage = () => {
    setFullscreenImage(null);
  };
  
  // Navigate to previous image
  const navigateToPrevImage = () => {
    if (!fullscreenImage || !fullscreenImage.allServices || fullscreenImage.allServices.length <= 1) return;
    
    const prevIndex = (fullscreenImage.currentIndex - 1 + fullscreenImage.allServices.length) % fullscreenImage.allServices.length;
    const prevService = fullscreenImage.allServices[prevIndex];
    
    setFullscreenImage({
      ...fullscreenImage,
      url: prevService.image_url,
      name: prevService.name,
      currentIndex: prevIndex
    });
  };
  
  // Navigate to next image
  const navigateToNextImage = () => {
    if (!fullscreenImage || !fullscreenImage.allServices || fullscreenImage.allServices.length <= 1) return;
    
    const nextIndex = (fullscreenImage.currentIndex + 1) % fullscreenImage.allServices.length;
    const nextService = fullscreenImage.allServices[nextIndex];
    
    setFullscreenImage({
      ...fullscreenImage,
      url: nextService.image_url,
      name: nextService.name,
      currentIndex: nextIndex
    });
  };

  // Keyboard event handler for arrow keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!fullscreenImage) return;
      
      if (e.key === 'ArrowLeft') {
        navigateToPrevImage();
      } else if (e.key === 'ArrowRight') {
        navigateToNextImage();
      } else if (e.key === 'Escape') {
        closeFullscreenImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImage]);

  // Set up swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateToNextImage(),
    onSwipedRight: () => navigateToPrevImage(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-center text-gray-500 text-lg">Booking not found.</p>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold">Select Services</h3>
            <ScrollArea className="h-[500px] rounded-md border p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => {
                  const isSelected = selectedServices.some((s) => s.id === service.id);
                  return (
                    <motion.div
                      key={service.id}
                      whileHover={{ scale: 1.02, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                      whileTap={{ scale: 0.98 }}
                      initial={false}
                      animate={isSelected ? { 
                        scale: [1, 1.05, 1],
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" 
                      } : { scale: 1 }}
                      transition={{ 
                        duration: 0.2,
                        ease: "easeInOut" 
                      }}
                      className={`relative rounded-xl border overflow-hidden transition-all duration-200 ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleServiceSelection(service)}
                    >
                      <div className="absolute top-3 right-3 z-10">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-primary text-white' : 'bg-white border border-gray-300'
                        }`}>
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>
                      </div>
                      
                      {service.image_url && (
                        <div className="relative h-48 w-full overflow-hidden">
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="object-cover w-full h-full transition-transform duration-500 hover:scale-110"
                          />
                          <div 
                            className="absolute bottom-2 right-2 p-1 bg-white rounded-full cursor-pointer shadow-md opacity-70 hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFullscreenImage(service.image_url, service.name);
                            }}
                          >
                            <Maximize className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                      )}
                      
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-lg">{service.name}</h4>
                          <span className="text-lg font-bold text-primary">₹{service.price}</span>
                        </div>
                        
                        {service.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {service.description}
                          </p>
                        )}
                        
                        <AnimatePresence>
                          {isSelected && service.type === "input" && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="pt-2"
                            >
                              <Input
                                type="text"
                                placeholder="Add details"
                                value={serviceInputs[service.id] || ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleInputChange(service.id, e.target.value);
                                }}
                                className="w-full border-primary focus:ring-2 focus:ring-primary/30"
                                aria-label={`Input for service ${service.name}`}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        {/* Care Tip Input for Selected Services */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="pt-2"
                            >
                              <Label htmlFor={`care-tip-${service.id}`} className="text-xs mb-1 block text-muted-foreground">
                                Care tip (optional):
                              </Label>
                              <Input
                                id={`care-tip-${service.id}`}
                                type="text"
                                placeholder="Add care tip for this service"
                                value={careTips[service.id] || ""}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleCareTipChange(service.id, e.target.value);
                                }}
                                className="w-full border-primary focus:ring-2 focus:ring-primary/30 text-sm"
                                aria-label={`Care tip for ${service.name}`}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        );

      case 2:
        const totalBill = selectedServices.reduce(
          (acc, service) => acc + Number.parseFloat(service.price),
          0
        );
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-lg font-semibold">Review Your Bill</h3>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <ScrollArea className="h-[300px] p-4">
                {selectedServices.map((service) => (
  <div key={service.id} className="flex items-center py-3 border-b last:border-b-0">
    {service.image_url && (
      <div className="h-12 w-12 rounded-md overflow-hidden mr-3 flex-shrink-0">
        <img
          src={service.image_url}
          alt={service.name}
          className="h-full w-full object-cover"
        />
      </div>
    )}
    <div className="flex-grow">
      <div className="font-medium">{service.name}</div>
      {service.type === "input" && serviceInputs[service.id] && (
        <div className="text-sm text-muted-foreground">
          {serviceInputs[service.id]}
        </div>
      )}
      {/* Show the care tip if provided */}
      {careTips[service.id] && (
        <div className="text-sm text-muted-foreground">
          Care Tip: {careTips[service.id]}
        </div>
      )}
    </div>
    <div className="font-bold text-primary">₹{service.price}</div>
  </div>
))}

                </ScrollArea>
                <div className="p-4 bg-muted/30">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{totalBill.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-8xl">
      <CardHeader className="bg-primary rounded-t-lg text-primary-foreground">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">Booking Details</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Manage and review your booking
            </CardDescription>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate("/home")}
            className="flex items-center space-x-2"
            aria-label="Back to Bookings"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <Label className="font-semibold">Customer Name:</Label>
              <span>{booking.customer_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-primary" />
              <Label className="font-semibold">Contact Number:</Label>
              <span>{booking.contact_number}</span>
            </div>
            <div className="flex items-center space-x-2">
              <DogIcon className="h-5 w-5 text-primary" />
              <Label className="font-semibold">Dog Name:</Label>
              <span>{booking.dog_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Paw className="h-5 w-5 text-primary" />
              <Label className="font-semibold">Dog Breed:</Label>
              <span>{booking.dog_breed}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <Label className="font-semibold">Booking Date:</Label>
              <span>{format(new Date(booking.booking_date), "PPP")}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <Label className="font-semibold">Time Slot:</Label>
              <span>
                {booking.sub_time_slots?.time_slots?.start_time
                  ? format(parse(booking.sub_time_slots.time_slots.start_time, "HH:mm:ss", new Date()), "hh:mm a")
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <Label className="font-semibold">Sub-Time Slot:</Label>
              <span>
                {booking.sub_time_slots?.description ||
                  `Slot ${booking.sub_time_slots?.slot_number}` ||
                  "N/A"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="font-semibold">Status:</Label>
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
            </div>
          </div>
        </div>
        <Separator className="my-6" />
        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
      </CardContent>
      <CardFooter className="flex flex-col md:flex-row justify-between items-center bg-muted/50 p-4">
        <div className="flex space-x-2 mb-4 md:mb-0">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex items-center space-x-2"
              aria-label="Back to Previous Step"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Services</span>
            </Button>
          )}
          {currentStep < 2 && (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={selectedServices.length === 0 || submitting}
              className="flex items-center space-x-2"
              aria-label="Proceed to Review Bill"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          {currentStep === 2 && booking.status === "reserved" && (
            <Button
              onClick={handleInitialSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirm Booking
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          )}
          {currentStep === 2 && (booking.status === "progressing" || booking.status === "checked_in") && (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Update Booking
                </>
              ) : (
                "Update Booking"
              )}
            </Button>
          )}
          {(booking.status === "progressing" || booking.status === "checked_in") && (
            <Button onClick={handleCompleteBooking} className="bg-green-500 hover:bg-green-600 text-white">
              <Check className="mr-2 h-4 w-4" /> Complete Booking
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white text-gray-800">
                <Printer className="mr-2 h-4 w-4" /> Print Slip
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handlePrintSlip("customer")}>Customer Slip</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrintSlip("groomer")}>Groomer Slip</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>

      {/* Fullscreen Image Dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={() => fullscreenImage && closeFullscreenImage()}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black">
          <div className="relative w-full" {...swipeHandlers}>
            <div className="absolute top-2 right-2 z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closeFullscreenImage}
                className="rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Navigation arrows */}
            {fullscreenImage?.allServices && fullscreenImage.allServices.length > 1 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={navigateToPrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 z-10"
                  aria-label="Previous image"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={navigateToNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 z-10"
                  aria-label="Next image"
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </>
            )}
            
            <div className="flex items-center justify-center min-h-[300px] max-h-[80vh]">
              {fullscreenImage?.url && (
                <img 
                  src={fullscreenImage.url} 
                  alt={fullscreenImage.name || "Service image"} 
                  className="max-w-full max-h-[80vh] object-contain"
                />
              )}
            </div>
            
            {fullscreenImage?.name && (
              <div className="bg-black text-white p-4 text-center">
                <h3 className="text-xl font-medium">{fullscreenImage.name}</h3>
                {fullscreenImage?.allServices && fullscreenImage.allServices.length > 1 && (
                  <p className="text-sm text-gray-400 mt-1">
                    {fullscreenImage.currentIndex + 1} of {fullscreenImage.allServices.length}
                  </p>
                )}
              </div>
            )}
            
            {/* Touch indicator for mobile users */}
            <div className="absolute bottom-20 left-0 right-0 flex justify-center opacity-70 pointer-events-none">
              <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm transition-opacity duration-200">
                Swipe or use arrow keys to navigate
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Feedback</DialogTitle>
            <DialogDescription>
              Please share your experience with our service. This is optional but helps us improve.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Star Rating */}
            <div className="space-y-2">
      <label className="font-medium">Rating</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFeedbackRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-transform transform hover:scale-110 focus:outline-none"
            aria-label={`${star} stars`}
          >
            <Star
              className={`h-8 w-8 transition-colors duration-300 ${
                (hoverRating >= star || feedbackRating >= star)
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-gray-300"
              }`}
              strokeWidth={hoverRating >= star || feedbackRating >= star ? 0 : 2} // Remove stroke when selected
            />
          </button>
        ))}
      </div>
    </div>
            
            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="feedback-comments" className="font-medium">Comments</Label>
              <Textarea
                id="feedback-comments"
                placeholder="Tell us about your experience (optional)"
                className="min-h-[100px]"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={skipFeedback}
              className="sm:w-auto w-full"
            >
              Skip
            </Button>
            <Button
              onClick={handleFeedbackSubmit}
              disabled={feedbackSubmitting}
              className="sm:w-auto w-full"
            >
              {feedbackSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
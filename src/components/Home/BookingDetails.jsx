import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
// Import the printing functions
import { handleCustomerPrintSlip } from "./CustomerSlip";
import { handleGroomerPrintSlip } from "./GroomerSlip";

import {
  Loader2,
  Pencil,
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
  Plus,
  AlertCircle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogOverlay, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StarIcon, Star, Search } from "lucide-react";

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState([]);
  const [servicesUpdated, setServicesUpdated] = useState(false);
  const [serviceInputs, setServiceInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [careTips, setCareTips] = useState({});
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [groomers, setGroomers] = useState([]);
  const [selectedGroomer, setSelectedGroomer] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
  // New state for multi-payment mode
  const [paymentModes, setPaymentModes] = useState([
    { mode: 'cash', selected: false, amount: 0 },
    { mode: 'UPI', selected: false, amount: 0 },
    { mode: 'swipe', selected: false, amount: 0 },
    { mode: 'credit', selected: false, amount: 0 }
  ]);
  const [paymentState, setPaymentState] = useState('input'); // 'input', 'review', 'completed'
  const [paymentValidationError, setPaymentValidationError] = useState('');
  const [calculatedTotal, setCalculatedTotal] = useState(0);

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
  
      // Check if services exist in the database for this booking
      if (data.booking_services_selected && data.booking_services_selected.length > 0) {
        setServicesUpdated(true);
      } else {
        setServicesUpdated(false);
      }
  
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
      const servicesData = data || [];
      setServices(servicesData);
      setFilteredServices(servicesData);
    } catch (error) {
      toast.error(`Failed to fetch services: ${error.message}`);
    }
  }, []);

  // Fetch all groomers
  const fetchGroomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("groomers")
        .select("*")
        .order("name");
      if (error) throw error;
      setGroomers(data || []);
    } catch (error) {
      toast.error(`Failed to fetch groomers: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    fetchBookingDetails();
    fetchAllServices();
    fetchGroomers();
  }, [fetchBookingDetails, fetchAllServices, fetchGroomers]);

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

  // Handle groomer selection
  const handleGroomerSelection = useCallback(async (groomerId) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ groomer_id: groomerId })
        .eq("id", id);
      if (error) throw error;
      setSelectedGroomer(groomerId);
      toast.success("Groomer assigned successfully!");
    } catch (error) {
      toast.error(`Failed to assign groomer: ${error.message}`);
    }
  }, [id]);

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
  
      // Set services updated to true after successful update
      setServicesUpdated(true);
      
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
  
      // Set services updated to true after successful insertion
      setServicesUpdated(true);
      
      toast.success("Booking confirmed successfully!");
      navigate("/home");
    } catch (error) {
      toast.error(`Failed to submit booking: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }, [id, selectedServices, serviceInputs, careTips, navigate]);

  // Calculate total bill
  const calculateTotalBill = useCallback(() => {
    return selectedServices.reduce(
      (acc, service) => acc + Number.parseFloat(service.price),
      0
    );
  }, [selectedServices]);

  // Update calculatedTotal when selectedServices changes
  useEffect(() => {
    const total = calculateTotalBill();
    setCalculatedTotal(total);
    
    // Reset payment amounts when total changes
    setPaymentModes(prev => prev.map(pm => ({
      ...pm,
      amount: 0
    })));
  }, [selectedServices, calculateTotalBill]);

  // Handle payment mode selection
  const handlePaymentModeSelection = (mode) => {
    setPaymentModes(prevModes => {
      const updatedModes = prevModes.map(pm => ({
        ...pm,
        selected: pm.mode === mode ? !pm.selected : pm.selected
      }));
  
      // Get newly selected modes
      const selectedModes = updatedModes.filter(pm => pm.selected);
      const totalBill = calculateTotalBill();
  
      // If no modes selected, reset all amounts
      if (selectedModes.length === 0) {
        return updatedModes.map(pm => ({ ...pm, amount: 0 }));
      }
  
      // Distribute amount evenly among selected modes
      const amountPerMode = totalBill / selectedModes.length;
      return updatedModes.map(pm => ({
        ...pm,
        amount: pm.selected ? amountPerMode : 0
      }));
    });
    
    setPaymentValidationError('');
  };

  // Handle payment amount change with auto-adjustment
  const handlePaymentAmountChange = (mode, value) => {
    const numValue = parseFloat(value) || 0;
    const totalBill = calculateTotalBill();

    // Check if entered amount exceeds total bill
    if (numValue > totalBill) {
      toast.error(`Amount entered (₹${numValue.toFixed(2)}) exceeds total bill (₹${totalBill.toFixed(2)})`);
      return;
    }
  
    setPaymentModes(prevModes => {
      const selectedModes = prevModes.filter(pm => pm.selected);
      if (selectedModes.length <= 1) {
        return prevModes.map(pm => ({
          ...pm,
          amount: pm.mode === mode ? numValue : pm.amount
        }));
      }
  
      // Calculate remaining amount to distribute
      const remainingAmount = totalBill - numValue;
      const otherSelectedModes = selectedModes.filter(pm => pm.mode !== mode);
      const amountPerOtherMode = Math.max(0, remainingAmount / otherSelectedModes.length);
  
      return prevModes.map(pm => {
        if (pm.mode === mode) return { ...pm, amount: numValue };
        if (pm.selected && pm.mode !== mode) return { ...pm, amount: amountPerOtherMode };
        return pm;
      });
    });
  
    setPaymentValidationError('');
  };

  // Validate payment amounts before proceeding
  const validatePaymentAmounts = () => {
    // Get selected payment modes
    const selectedModes = paymentModes.filter(pm => pm.selected);
    
    // If no payment modes are selected, show error
    if (selectedModes.length === 0) {
      setPaymentValidationError('Please select at least one payment mode');
      return false;
    }
    
    // Calculate total of entered amounts
    const totalEnteredAmount = selectedModes.reduce((sum, pm) => sum + pm.amount, 0);
    const totalBillAmount = calculateTotalBill();
    
    // If amounts don't match bill total, show error
    if (Math.abs(totalEnteredAmount - totalBillAmount) > 0.01) { // Allow tiny rounding errors
      setPaymentValidationError(`Total payment amount (₹${totalEnteredAmount.toFixed(2)}) does not match the bill total (₹${totalBillAmount.toFixed(2)})`);
      return false;
    }
    
    return true;
  };

  // Handle moving to payment review
  const handleMoveToReview = () => {
    if (validatePaymentAmounts()) {
      setPaymentState('review');
    }
  };

  // Handle moving back to payment input
  const handleBackToPaymentInput = () => {
    setPaymentState('input');
  };

  // Handle completing booking with multiple payment modes
  const handleCompleteBooking = async () => {
    setSubmitting(true);
    try {
      // Get selected payment modes with amounts
      const selectedPayments = paymentModes.filter(pm => pm.selected);
      
      // Make sure we have valid payment data
      if (selectedPayments.length === 0) {
        throw new Error('No payment modes selected');
      }
      
      // Prepare payment data for storage
      const paymentData = selectedPayments.map(pm => ({
        mode: pm.mode,
        amount: pm.amount
      }));
      
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
      
      // Fetch shop name
      let shopName = null;
      if (booking.shop_id) {
        const { data: shopData, error: shopError } = await supabase
          .from("shops")
          .select("name")
          .eq("id", booking.shop_id)
          .single();
        
        if (shopError) {
          console.error("Error fetching shop name:", shopError);
        } else if (shopData) {
          shopName = shopData.name;
        }
      }
      
      // Fetch sub_time_slot description
      let slotDescription = null;
      if (booking.sub_time_slot_id) {
        const { data: slotData, error: slotError } = await supabase
          .from("sub_time_slots")
          .select("description, slot_number")
          .eq("id", booking.sub_time_slot_id)
          .single();
        
        if (slotError) {
          console.error("Error fetching slot description:", slotError);
        } else if (slotData) {
          slotDescription = slotData.description || `Slot ${slotData.slot_number}`;
        }
      }

      // If we couldn't fetch the shop name from the database, try to get it from the booking
      if (!shopName && booking.shop) {
        shopName = booking.shop.name;
      }

      // If we couldn't fetch the slot description, try to get it from the booking
      if (!slotDescription && booking.sub_time_slots) {
        slotDescription = booking.sub_time_slots.description || 
                          `Slot ${booking.sub_time_slots.slot_number}`;
      }
      
      // Create historical booking entry with primary payment mode
      const primaryPayment = selectedPayments[0];
      
      // Prepare the historical booking data
      const historicalBookingData = {
        original_booking_id: id,
        customer_name: booking.customer_name,
        contact_number: booking.contact_number,
        dog_name: booking.dog_name,
        dog_breed: booking.dog_breed,
        booking_date: booking.booking_date,
        slot_time: booking.sub_time_slots?.time_slots?.start_time,
        sub_time_slot_id: booking.sub_time_slot_id,
        shop_id: booking.shop_id,
        shop_name: shopName || "Unknown Shop",
        slot_description: slotDescription || "Unknown Slot",
        groomer_id: booking.groomer_id,
        groomer_name: groomers.find(g => g.id === booking.groomer_id)?.name || "Unknown Groomer",
        status: 'completed',
        services: servicesData,
        feedback: null,
        check_in_time: booking.check_in_time,
        payment_mode: primaryPayment.mode, // Primary payment mode for DB column
        payment_details: paymentData, // All payment data as JSON
        payment_timestamp: new Date().toISOString()
      };
      
      // Store the booking in historical_bookings
      const { data: historicalData, error: historicalError } = await supabase
        .from("historical_bookings")
        .insert(historicalBookingData)
        .select()
        .single();
      
      if (historicalError) {
        console.error("Error inserting historical booking:", historicalError);
        throw historicalError;
      }
      
      // Update original booking status
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", id);
      
      if (error) throw error;
      
      // Close payment dialog and update payment state
      setShowPaymentDialog(false);
      setPaymentState('completed');
      
      toast.success("Booking COMPLETED!");
      
      // Show feedback dialog after completing
      setShowFeedbackDialog(true);
    } catch (error) {
      console.error("Complete booking error:", error);
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
    if (copyType.toLowerCase() === "customer") {
      handleCustomerPrintSlip(booking, selectedServices, serviceInputs);
    } else if (copyType.toLowerCase() === "groomer") {
      handleGroomerPrintSlip(booking, selectedServices, serviceInputs, groomers);
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

  // Calculate total payment amount from selected modes
  const totalPaymentAmount = paymentModes
    .filter(pm => pm.selected)
    .reduce((total, pm) => total + parseFloat(pm.amount || 0), 0);

  // Calculate remaining amount to be allocated
  const remainingAmount = calculatedTotal - totalPaymentAmount;

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
            className="space-y-6 "
          >
            <div className="justify-between space-y-2  md:flex md:space-y-0">
              <h3 className="text-lg font-semibold">Select Services</h3>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search services..."
                  className="w-full pl-10"
                  onChange={(e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filtered = services.filter(service =>
                      service.name.toLowerCase().includes(searchTerm) ||
                      service.description?.toLowerCase().includes(searchTerm)
                    );
                    setFilteredServices(filtered);
                  }}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
              </div>
            </div>
            <ScrollArea className="h-[500px] rounded-md border p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => {
                  const isSelected = selectedServices.some((s) => s.id === service.id);
                  return (
                    <motion.div
                      key={service.id}
                      whileHover={{ scale: 1.01, boxShadow: "0 10px 20px -5px rgba(0, 0, 0, 0.15)" }}
                      whileTap={{ scale: 0.98 }}
                      initial={false}
                      animate={isSelected ? { 
                        scale: [1, 1.05, 1],
                        transition: { duration: 0.3 }
                      } : { scale: 1 }}
                      className={`relative rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] transform -translate-y-1'
                          : 'border-pink-100 hover:border-primary/50 hover:shadow-lg'
                      }`}
                      onClick={() => handleServiceSelection(service)}
                    >
                    
                      
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
                <ScrollArea className="h-[300px] p-4 bg-gray-50">
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
            <CardDescription className="text-primary-foreground/80 hidden md:block">
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
      <CardContent className="p-4 md:p-6">
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 mb-4">
    {/* Left column */}
    <div className="space-y-4">
      <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
        <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        <span className="font-medium">Customer:</span>
        <span className="truncate">{booking.customer_name}</span>
      </div>
      <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
        <Phone className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        <span className="font-medium">Contact:</span>
        <span className="truncate">{booking.contact_number}</span>
      </div>
      <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
        <DogIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        <span className="font-medium">Dog:</span>
        <span className="truncate">{booking.dog_name}</span>
      </div>
      <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
        <Paw className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        <span className="font-medium">Breed:</span>
        <span className="truncate">{booking.dog_breed}</span>
      </div>
    
      {booking.check_in_time && (   
        <div className="hidden md:block ">
        <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
          <Check className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <span className="font-medium">Checked in:</span>
          <span>{format(new Date(booking.check_in_time), "PPp")}</span>
        </div>
        </div>
      )}
     
    </div>

    {/* Right column */}
    <div className="space-y-4">
    {booking.check_in_time && (  
        <div className=" md:hidden ">  
        <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
          <Check className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <span className="font-medium">Checked in:</span>
          <span>{format(new Date(booking.check_in_time), "PPp")}</span>
        </div>
        </div>
      )}
      <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
        <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        <span className="font-medium">Date:</span>
        <span>{format(new Date(booking.booking_date), "PPP")}</span>
      </div>
      <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
        <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        <span className="font-medium">Slot:</span>
        <span>
          {booking.sub_time_slots?.time_slots?.start_time
            ? format(
                parse(
                  booking.sub_time_slots.time_slots.start_time,
                  "HH:mm:ss",
                  new Date()
                ),
                "hh:mm a"
              )
            : "N/A"}
        </span>
      </div>
      <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
        <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        <span className="font-medium">Sub‑Slot:</span>
        <span>
          {booking.sub_time_slots?.description ||
            `Slot ${booking.sub_time_slots?.slot_number}` ||
            "N/A"}
        </span>
      </div>
      <div className="flex items-center space-x-1 md:space-x-2 text-sm md:text-base">
        <span className="font-medium">Status:</span>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs md:text-sm font-medium ${
            booking.status === "checked_in"
              ? "bg-green-100 text-green-800"
              : booking.status === "reserved"
              ? "bg-yellow-100 text-yellow-800"
              : booking.status === "progressing"
              ? "bg-blue-100 text-blue-800"
              : booking.status === "completed"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {booking.status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      {(booking.status === "checked_in" ||
        booking.status === "progressing") && (
        <div className="mt-3 flex items-center space-x-2 text-sm md:text-base">
          <span className="font-medium">Assign Groomer:</span>
          <Select
            value={selectedGroomer || booking.groomer_id || ""}
            onValueChange={handleGroomerSelection}
          >
            <SelectTrigger className="w-full md:w-48 text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {groomers.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  </div>

  <Separator className="my-4" />

  <AnimatePresence mode="wait" className="">{renderStepContent()}</AnimatePresence>
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
      {/* Wrap your actions */}
<div className=" flex space-x-2 sm:flex-row sm:gap-2">
  {/* Update Booking */}
  {currentStep === 2 && (booking.status === "progressing" || booking.status === "checked_in") && (
    <Button
      onClick={handleSubmit}
      disabled={submitting}
      className="w-full sm:w-auto px-3 py-2 text-sm sm:text-base bg-primary hover:bg-primary/90 flex justify-center items-center"
    >
         <Pencil className="h-4 w-4" />
      {submitting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Update
        </>
      ) : (
        "Update"
      )}
    </Button>
  )}

  {/* Complete Booking */}
  {(booking.status === "progressing" || booking.status === "checked_in") && (
    <Button
      onClick={() => {
        setPaymentState("input");
        setPaymentValidationError("");
        setShowPaymentDialog(true);
      }}
      disabled={!servicesUpdated || submitting}
      className="w-full sm:w-auto px-3 py-2 text-sm sm:text-base bg-green-500 hover:bg-green-600 text-white flex justify-center items-center"
    >
      {submitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Check className="h-4 w-4" />
          Complete <span className="hidden md:block">booking</span>
        </>
      )}
    </Button>
  )}

  {/* Print Slip dropdown */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        className="w-full sm:w-auto px-3 py-2 text-sm sm:text-base flex justify-center items-center"
      >
        <Printer className="h-4 w-4" />
        {/* hide the text on very small screens */}
        <span className="ml-2 hidden xs:inline sm:inline">Print Slip</span>
        <ChevronDown className="ml-1 h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => handlePrintSlip("customer")}>
        Customer Slip
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handlePrintSlip("groomer")}>
        Groomer Slip
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>

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
      
      {/* Confirm Complete Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this booking as completed? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowConfirmDialog(false);
                setPaymentState('input');
                setShowPaymentDialog(true);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Payment Dialog */}
      <Dialog 
        open={showPaymentDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setShowPaymentDialog(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[98vh]">
          <DialogHeader>
            <DialogTitle>
              {paymentState === 'input' ? 'Payment Details' : 
               paymentState === 'review' ? 'Review Payment' : 'Payment Complete'}
            </DialogTitle>
            <DialogDescription>
              {paymentState === 'input' ? 'Select payment methods and enter amounts' : 
               paymentState === 'review' ? 'Confirm payment details before completing' : 
               'Payment has been recorded successfully'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-8rem)] px-1">
            {paymentState === 'input' && (
              <>
              <div className="space-y-4 py-4">
                <Separator className="-mt-4" />
                
                {/* Payment modes selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {paymentModes.map((paymentMode) => (
                    <div 
                      key={paymentMode.mode}
                      onClick={() => handlePaymentModeSelection(paymentMode.mode)}
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${paymentMode.selected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={paymentMode.selected}
                            onCheckedChange={() => handlePaymentModeSelection(paymentMode.mode)}
                            id={`payment-${paymentMode.mode}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Label 
                            htmlFor={`payment-${paymentMode.mode}`}
                            className="font-medium cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {paymentMode.mode === 'UPI' ? 'UPI' : 
                             paymentMode.mode.charAt(0).toUpperCase() + paymentMode.mode.slice(1)}
                          </Label>
                        </div>
                        <span className="text-2xl">
                          {paymentMode.mode === 'cash' ? '💵' : 
                           paymentMode.mode === 'UPI' ? '📱' : 
                           paymentMode.mode === 'swipe' ? '💳' : '📝'}
                        </span>
                      </div>
                      
                      {/* Amount input field - only show if selected */}
                      <AnimatePresence>
                        {paymentMode.selected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="mt-2">
                              <Label htmlFor={`amount-${paymentMode.mode}`} className="text-sm text-muted-foreground mb-1 block">
                                Amount (₹)
                              </Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                <Input
                                  id={`amount-${paymentMode.mode}`}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={paymentMode.amount || ''}
                                  onChange={(e) => handlePaymentAmountChange(paymentMode.mode, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="pl-8"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
                
                {/* Payment summary */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Total Selected:</span>
                    <span className={remainingAmount === 0 ? 'text-green-600 font-bold' : ''}>
                      ₹{totalPaymentAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Remaining:</span>
                    <span className={remainingAmount === 0 ? 'text-green-600' : 'text-amber-600'}>
                      ₹{remainingAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {/* Error message */}
                {paymentValidationError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-600 text-sm">{paymentValidationError}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPaymentDialog(false)}
                  className="sm:w-auto w-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMoveToReview}
                  disabled={submitting || totalPaymentAmount <= 0 || Math.abs(remainingAmount) > 0.01}
                  className="sm:w-auto w-full"
                >
                  Next
                </Button>
              </DialogFooter>
            </>
          )}
          </ScrollArea>

          {paymentState === 'review' && (
            <>
              <div className="space-y-4 py-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Service Summary</h3>
                  <div className="space-y-3">
                    {selectedServices.map(service => (
                      <div key={service.id} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Paw className="h-4 w-4" />
                          <span>{service.name}</span>
                        </div>
                        <span className="font-medium">₹{parseFloat(service.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Payment Summary</h3>
                  <div className="space-y-3">
                    {paymentModes
                      .filter(pm => pm.selected)
                      .map(pm => (
                        <div key={pm.mode} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">
                              {pm.mode === 'cash' ? '💵' : 
                               pm.mode === 'UPI' ? '📱' : 
                               pm.mode === 'swipe' ? '💳' : '📝'}
                            </span>
                            <span>
                              {pm.mode === 'UPI' ? 'UPI' : 
                               pm.mode.charAt(0).toUpperCase() + pm.mode.slice(1)}
                            </span>
                          </div>
                          <span className="font-medium">₹{parseFloat(pm.amount).toFixed(2)}</span>
                        </div>
                      ))
                    }
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>₹{totalPaymentAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-amber-800 text-sm">
                    Please confirm the payment details. Once confirmed, you will proceed to complete the booking.
                  </p>
                </div>
              </div>
              
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleBackToPaymentInput}
                  className="sm:w-auto w-full"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCompleteBooking}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white sm:w-auto w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Complete Booking
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
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
                        
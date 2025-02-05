// src/components/Home/BookingDetails.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
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
  ChevronDown  
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox"
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
              });
            }
            return acc;
          },
          []
        );
        setSelectedServices(uniqueServices);
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

      // Insert new booking_services_selected
      const bookingServices = selectedServices.map((service) => ({
        booking_id: id,
        service_id: service.id,
        input_value: service.type === "input" ? serviceInputs[service.id] || "" : null,
      }));
      const { error: insertError } = await supabase
        .from("booking_services_selected")
        .insert(bookingServices);
      if (insertError) throw insertError;

      // Update booking status to "progressing" if current status is reserved or checked_in
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
  }, [id, selectedServices, serviceInputs, booking?.status, fetchBookingDetails]);

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
  }, [id, selectedServices, serviceInputs, navigate]);

  // Handle marking the booking as completed (check-out)
  const handleCompleteBooking = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", id);
      if (error) throw error;
      toast.success("Booking marked as COMPLETED!");
      fetchBookingDetails();
    } catch (error) {
      toast.error(`Error marking booking as completed: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
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
            <ScrollArea className="h-[300px] rounded-md border p-4">
              {services.map((service) => (
                <div key={service.id} className="flex items-center space-x-2 mb-4">
                  {service.type === "checkbox" ? (
                    <>
                      <Checkbox
                        id={`service-${service.id}`}
                        checked={selectedServices.some((s) => s.id === service.id)}
                        onCheckedChange={() => handleServiceSelection(service)}
                        aria-label={`Select service ${service.name}`}
                      />
                      <Label htmlFor={`service-${service.id}`} className="flex-grow">
                        {service.name} - ₹{service.price}
                      </Label>
                    </>
                  ) : service.type === "input" ? (
                    <>
                      <Input
                        type="text"
                        placeholder={`Details for ${service.name}`}
                        value={serviceInputs[service.id] || ""}
                        onChange={(e) => handleInputChange(service.id, e.target.value)}
                        className="w-1/2"
                        aria-label={`Input for service ${service.name}`}
                      />
                      <Label htmlFor={`service-${service.id}`} className="flex-grow">
                        {service.name} - ₹{service.price}
                      </Label>
                    </>
                  ) : null}
                </div>
              ))}
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
            <ScrollArea className="h-[300px] rounded-md border p-4">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex justify-between mb-2">
                  <span>
                    {service.name}
                    {service.type === "input" && serviceInputs[service.id]
                      ? ` (${serviceInputs[service.id]})`
                      : ""}
                  </span>
                  <span>₹{service.price}</span>
                </div>
              ))}
              <Separator className="my-4" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{totalBill.toFixed(2)}</span>
              </div>
            </ScrollArea>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-8xl ">
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
    </Card>
  );
}

// src/components/Home/BookingDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react"; // Removed CheckCircle
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion"; // For animations

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

  // Fetch booking details
  const fetchBookingDetails = async () => {
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
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      setBooking(data);
    } catch (error) {
      toast.error(`Error fetching booking details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all available services
  const fetchAllServices = async () => {
    try {
      const { data, error } = await supabase.from("services").select("*");

      if (error) {
        throw error;
      }

      setServices(data || []);
    } catch (error) {
      toast.error(`Error fetching services: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
    fetchAllServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle service selection
  const handleServiceSelection = (service) => {
    if (selectedServices.some(s => s.id === service.id)) {
      // Deselect service
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));

      // Remove input value if service type is 'input'
      if (service.type === 'input') {
        const updatedInputs = { ...serviceInputs };
        delete updatedInputs[service.id];
        setServiceInputs(updatedInputs);
      }
    } else {
      // Select service
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Handle input change for services of type 'input'
  const handleInputChange = (serviceId, value) => {
    setServiceInputs({
      ...serviceInputs,
      [serviceId]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (selectedServices.length === 0) {
      toast.error("Please select at least one service.");
      return;
    }

    setSubmitting(true);

    try {
      // Insert selected services into booking_services_selected table
      const bookingServices = selectedServices.map(service => ({
        booking_id: id,
        service_id: service.id,
        input_value: service.type === 'input' ? serviceInputs[service.id] || "" : null,
      }));

      const { data, error } = await supabase.from("booking_services_selected").insert(bookingServices);

      if (error) {
        throw error;
      }

      // Update booking status to 'progressing'
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: 'progressing' })
        .eq("id", id);

      if (updateError) {
        throw updateError;
      }

      toast.success("Booking updated successfully!");
      navigate("/bookings"); // Redirect to bookings page or desired location
    } catch (error) {
      toast.error(`Error submitting booking: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading booking details" />
      </div>
    );
  }

  if (!booking) {
    return <p className="text-center text-gray-500">Booking not found.</p>;
  }

  // Render content based on the current step
  const renderStepContent = () => {
    switch (currentStep) {
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
            <Label className="font-semibold">Select Services:</Label>
            <div className="space-y-4">
              {services.map(service => (
                <div key={service.id} className="flex items-center space-x-2">
                  {service.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      checked={selectedServices.some(s => s.id === service.id)}
                      onChange={() => handleServiceSelection(service)}
                      aria-label={`Select service ${service.name}`}
                    />
                  ) : service.type === 'input' ? (
                    <>
                      <input
                        type="checkbox"
                        checked={selectedServices.some(s => s.id === service.id)}
                        onChange={() => handleServiceSelection(service)}
                        aria-label={`Select service ${service.name}`}
                      />
                      <Input
                        type="text"
                        placeholder={`Enter details for ${service.name}`}
                        value={serviceInputs[service.id] || ""}
                        onChange={(e) => handleInputChange(service.id, e.target.value)}
                        disabled={!selectedServices.some(s => s.id === service.id)}
                        aria-label={`Input for service ${service.name}`}
                      />
                    </>
                  ) : null}
                  <span>{service.name} - ₹{service.price}</span>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 2:
        // Calculate total bill
        const totalBill = selectedServices.reduce((acc, service) => acc + parseFloat(service.price), 0);

        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Label className="font-semibold">Review Your Bill:</Label>
            <div className="space-y-4">
              {selectedServices.map(service => (
                <div key={service.id} className="flex justify-between">
                  <span>{service.name}</span>
                  <span>₹{service.price}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>₹{totalBill.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto mt-8">
      <CardHeader className="flex justify-between items-center">
        <div>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>Manage and review your booking.</CardDescription>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/home")}
          aria-label="Back"
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Booking Information */}
          <div className="space-y-2">
            <div className="flex flex-col">
              <Label className="font-semibold">Customer Name:</Label>
              <Input value={booking.customer_name} readOnly />
            </div>
            <div className="flex flex-col">
              <Label className="font-semibold">Contact Number:</Label>
              <Input value={booking.contact_number} readOnly />
            </div>
            <div className="flex flex-col">
              <Label className="font-semibold">Dog Name:</Label>
              <Input value={booking.dog_name} readOnly />
            </div>
            <div className="flex flex-col">
              <Label className="font-semibold">Dog Breed:</Label>
              <Input value={booking.dog_breed} readOnly />
            </div>
            <div className="flex flex-col">
              <Label className="font-semibold">Booking Date:</Label>
              <Input value={format(new Date(booking.booking_date), "PPP")} readOnly />
            </div>
            <div className="flex flex-col">
              <Label className="font-semibold">Time Slot:</Label>
              <Input
                value={
                  booking.sub_time_slots?.time_slots?.start_time
                    ? format(parse(booking.sub_time_slots.time_slots.start_time, 'HH:mm:ss', new Date()), "hh:mm a")
                    : "N/A"
                }
                readOnly
              />
            </div>
            <div className="flex flex-col">
              <Label className="font-semibold">Sub-Time Slot:</Label>
              <Input
                value={
                  booking.sub_time_slots?.description ||
                  `Slot ${booking.sub_time_slots?.slot_number}` ||
                  "N/A"
                }
                readOnly
              />
            </div>
            <div className="flex flex-col">
              <Label className="font-semibold">Status:</Label>
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
            </div>
          </div>
        </div>
        <AnimatePresence mode="wait">
          {renderStepContent()}
        </AnimatePresence>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        {currentStep > 1 && (
          <Button
            variant="outline"
            onClick={() => setCurrentStep(currentStep - 1)}
            aria-label="Go back to previous step"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
        )}
        {currentStep < 2 && (
          <Button
            variant="primary"
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={selectedServices.length === 0 || submitting}
            aria-label="Proceed to next step"
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {currentStep === 2 && (
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={submitting}
            aria-label="Submit booking and proceed"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// src/components/AllBookingDetails.jsx
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft, Star, Calendar, Clock, DogIcon, PawPrintIcon as Paw, User, Phone, Store, MapPin } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function AllBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serviceDetails, setServiceDetails] = useState([]);
  const [feedbackDetails, setFeedbackDetails] = useState(null);

  // Fetch booking details from historical_bookings
  const fetchHistoricalBookingDetails = useCallback(async () => {
    setLoading(true);
    try {
      // First try to get from historical_bookings using original_booking_id
      let { data: historicalData, error: historicalError } = await supabase
        .from("historical_bookings")
        .select("*")
        .eq("id", id)
        .single();

      // If not found by id, try original_booking_id
      if (historicalError) {
        const { data: historicalByOriginalId, error: originalIdError } = await supabase
          .from("historical_bookings")
          .select("*")
          .eq("original_booking_id", id)
          .single();

        if (!originalIdError) {
          historicalData = historicalByOriginalId;
          historicalError = null;
        }
      }

      if (historicalError) {
        // If not found in historical, try to get from regular bookings
        const { data: regularData, error: regularError } = await supabase
          .from("bookings")
          .select(`
            *,
            sub_time_slots (
              *,
              time_slots (
                start_time
              )
            ),
            shops (
              name,
              directions,
              phone_number
            )
          `)
          .eq("id", id)
          .single();

        if (regularError) throw regularError;
        
        // Also fetch services separately
        const { data: servicesData, error: servicesError } = await supabase
          .from("booking_services_selected")
          .select(`
            *,
            services (
              *
            )
          `)
          .eq("booking_id", id);
          
        if (servicesError) throw servicesError;
        
        // Format regular booking data to match historical format
        const formattedBooking = {
          ...regularData,
          shop_name: regularData.shops?.name,
          slot_description: regularData.sub_time_slots?.description || 
                           `Slot ${regularData.sub_time_slots?.slot_number}` || "N/A"
        };
        
        setBooking(formattedBooking);
        setServiceDetails(servicesData.map(item => ({
          id: item.service_id,
          name: item.services.name,
          price: item.services.price,
          type: item.services.type,
          description: item.services.description,
          image_url: item.services.image_url,
          input_value: item.input_value,
          care_tip: item.care_tip
        })));
      } else {
        // Data found in historical_bookings
        setBooking(historicalData);
        if (historicalData.services) {
          try {
            const parsedServices = typeof historicalData.services === 'string' 
              ? JSON.parse(historicalData.services) 
              : historicalData.services;
            setServiceDetails(Array.isArray(parsedServices) ? parsedServices : []);
          } catch (e) {
            console.error('Error parsing services:', e);
            setServiceDetails([]);
          }
        }
        if (historicalData.feedback) {
          try {
            const parsedFeedback = typeof historicalData.feedback === 'string'
              ? JSON.parse(historicalData.feedback)
              : historicalData.feedback;
            setFeedbackDetails(parsedFeedback);
          } catch (e) {
            console.error('Error parsing feedback:', e);
            setFeedbackDetails(null);
          }
        }
      }
    } catch (error) {
      toast.error(`Error fetching booking details: ${error.message}`);
      console.error("Error fetching booking details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchHistoricalBookingDetails();
  }, [fetchHistoricalBookingDetails]);

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

  // Calculate total bill amount
  const totalBill = serviceDetails.reduce(
    (total, service) => total + Number(service.price),
    0
  ).toFixed(2);

  // Format time function
  const formatTime = (timeStr) => {
    if (!timeStr) return "N/A";
    try {
      // If timeStr is already a date string, format it
      if (typeof timeStr === 'string' && timeStr.includes(':')) {
        // Check if it's in HH:mm:ss format
        const parts = timeStr.split(':');
        if (parts.length === 3) {
          const date = new Date();
          date.setHours(parseInt(parts[0]));
          date.setMinutes(parseInt(parts[1]));
          date.setSeconds(parseInt(parts[2]));
          return format(date, "hh:mm a");
        }
      }
      return timeStr;
    } catch (error) {
      return "N/A";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="bg-primary rounded-t-lg text-primary-foreground">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">Booking Details</CardTitle>
            <Button
              variant="secondary"
              onClick={() => navigate("/all-bookings")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </div>
          <CardDescription className="text-white">Review completed booking details</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg text-primary mb-3">Personal Information</h3>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <Label className="font-semibold">Customer:</Label>
                <span>{booking.customer_name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-primary" />
                <Label className="font-semibold">Contact:</Label>
                <span>{booking.contact_number}</span>
              </div>
            </div>

            {/* Pet Information */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg text-primary mb-3">Pet Information</h3>
              <div className="flex items-center space-x-2">
                <DogIcon className="h-5 w-5 text-primary" />
                <Label className="font-semibold">Name:</Label>
                <span>{booking.dog_name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Paw className="h-5 w-5 text-primary" />
                <Label className="font-semibold">Breed:</Label>
                <span>{booking.dog_breed}</span>
              </div>
            </div>

            {/* Shop Information */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg text-primary mb-3">Shop Details</h3>
              <div className="flex items-center space-x-2">
                <Store className="h-5 w-5 text-primary" />
                <Label className="font-semibold">Shop:</Label>
                <span>{booking.shop_name || "N/A"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <Label className="font-semibold">Groomer:</Label>
                <span>{booking.groomer_name || " "}</span>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg lg:col-span-2">
              <h3 className="font-semibold text-lg text-primary mb-3">Appointment Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <Label className="font-semibold">Date:</Label>
                  <span>{format(new Date(booking.booking_date), "PPP")}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <Label className="font-semibold">Time:</Label>
                  <span>{formatTime(booking.slot_time)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <Label className="font-semibold">Check-in:</Label>
                  <span>
                    {booking.check_in_time ? 
                      format(
                        new Date(
                          new Date(booking.check_in_time).getTime() + 
                          (5.5 * 60 * 60 * 1000) // Adding 5 hours and 30 minutes for Indian timezone
                        ),
                        "hh:mm a"
                      ) : " "}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <Label className="font-semibold">Completed:</Label>
                  <span>{booking.completed_at ? format(new Date(booking.completed_at), "hh:mm a") : "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg text-primary mb-3">Booking Status</h3>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${booking.status === "pending" ? "bg-yellow-200 text-yellow-700 border border-yellow-300" : booking.status === "checked_in" ? "bg-green-200 text-green-700 border border-green-300" : booking.status === "progressing" ? "bg-blue-200 text-blue-700 border border-blue-300" : booking.status === "completed" ? "bg-green-200 text-green-700 border border-green-300" : booking.status === "canceled" || booking.status === "cancelled" ? "bg-red-200 text-red-700 border border-red-300" : "bg-gray-200 text-gray-700 border border-gray-300"}`}>
                  {booking.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services and Bill Details */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Services & Bill Details</CardTitle>
          <CardDescription>Selected services and total bill amount</CardDescription>
        </CardHeader>
        <CardContent>
          {serviceDetails && serviceDetails.length > 0 ? (
            <div className="space-y-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceDetails.map((service, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          {service.input_value && <div className="text-sm mb-1">Input: {service.input_value}</div>}
                          {service.care_tip && <div className="text-sm text-gray-600">Care Tip: {service.care_tip}</div>}
                        </TableCell>
                        <TableCell className="text-right">₹{service.price}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-bold">Total</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{totalBill}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No services data available for this booking.</p>
          )}
        </CardContent>
      </Card>

      {/* Feedback Section */}
      {feedbackDetails && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Customer Feedback</CardTitle>
            <CardDescription>Customer's rating and comments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      feedbackDetails.rating >= star
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {feedbackDetails.rating}/5 stars
                </span>
              </div>
              
              {feedbackDetails.comment && (
                <div className="mt-2">
                  <Label className="font-semibold">Comment:</Label>
                  <p className="mt-1 text-gray-700 p-3 bg-gray-50 rounded-md">
                    "{feedbackDetails.comment}"
                  </p>
                </div>
              )}
              
              {feedbackDetails.created_at && (
                <div className="text-xs text-gray-500 mt-2">
                  Feedback submitted on {format(new Date(feedbackDetails.created_at), "PPP p")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
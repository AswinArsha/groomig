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
import { Loader2, ArrowLeft, Star, Calendar, Clock, DogIcon, PawPrintIcon as Paw, User, Phone, Store, MapPin, CreditCard, CheckCircle, PlusCircle, History, ArrowDown, ArrowDownIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export default function AllBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serviceDetails, setServiceDetails] = useState([]);
  const [feedbackDetails, setFeedbackDetails] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [lastPayment, setLastPayment] = useState(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentHistorySupported, setPaymentHistorySupported] = useState(true);

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

        // Fetch payment history if payment_mode is credit or if it was credit before
        if (historicalData.payment_mode) {
          fetchPaymentHistory(historicalData.id);
        }
      }
    } catch (error) {
      toast.error(`Error fetching booking details: ${error.message}`);
      console.error("Error fetching booking details:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Check if payment_history table exists
  const checkPaymentHistoryTable = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('id')
        .limit(1);
      
      // If we get a specific error about the table not existing
      if (error && error.code === '42P01') {
        setPaymentHistorySupported(false);
        console.warn("Payment history table does not exist yet");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking payment_history table:", error);
      setPaymentHistorySupported(false);
      return false;
    }
  };

  // Fetch payment history for credit payments
  const fetchPaymentHistory = async (bookingId) => {
    try {
      // First check if the table exists
      const tableExists = await checkPaymentHistoryTable();
      if (!tableExists) {
        return;
      }
      
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("booking_id", bookingId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setPaymentHistory(data);
        // Set the most recent payment
        setLastPayment(data[0]);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      // Don't show a toast here, as it might confuse users
    }
  };

  // Handle credit payment submission
  const handlePaymentSubmit = async () => {
    if (!paymentMode) {
      toast.error("Please select a payment mode");
      return;
    }

    setProcessingPayment(true);
    try {
      const paymentTimestamp = new Date().toISOString();
      const paymentAmount = serviceDetails.reduce((total, service) => total + Number(service.price), 0);
      
      // First check if the payment_history table exists
      const tableExists = await checkPaymentHistoryTable();
      
      // If the table exists, create a payment history record
      if (tableExists) {
        const { data: historyData, error: historyError } = await supabase
          .from("payment_history")
          .insert({
            booking_id: booking.id,
            payment_mode: paymentMode,
            payment_date: paymentTimestamp,
            amount: paymentAmount
          })
          .select();

        if (historyError) {
          console.error("Error inserting payment history:", historyError);
          // Continue with the main update even if this fails
        } else if (historyData && historyData.length > 0) {
          // Update the last payment in state
          setLastPayment(historyData[0]);
          
          // Refresh payment history
          fetchPaymentHistory(booking.id);
        }
      }

      // Update the historical_bookings record with the payment mode
      const { error: updateError } = await supabase
        .from("historical_bookings")
        .update({
          payment_mode: paymentMode,
          payment_timestamp: paymentTimestamp
        })
        .eq("id", booking.id);

      if (updateError) throw updateError;

      toast.success("Payment recorded successfully");
      setIsPaymentDialogOpen(false);
      
      // Update the local booking state
      setBooking(prev => ({
        ...prev,
        payment_mode: paymentMode,
        payment_timestamp: paymentTimestamp
      }));
    } catch (error) {
      toast.error(`Error recording payment: ${error.message}`);
      console.error("Error recording payment:", error);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Create payment_history table if it doesn't exist
  const createPaymentHistoryTable = async () => {
    try {
      const { error } = await supabase.rpc('create_payment_history_table');
      
      if (!error) {
        setPaymentHistorySupported(true);
        toast.success("Payment history tracking has been set up");
        return true;
      } else {
        console.error("Error creating payment_history table:", error);
        return false;
      }
    } catch (error) {
      console.error("Error creating payment_history table:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchHistoricalBookingDetails();
    checkPaymentHistoryTable();
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

  // Format payment mode for display
  const formatPaymentMode = (mode) => {
    if (!mode) return "Not Paid";
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };

  // Get payment badge color
  const getPaymentBadgeColor = (mode) => {
    switch (mode) {
      case 'cash':
        return "bg-green-100 text-green-700 border border-green-300";
      case 'UPI':
        return "bg-purple-100 text-purple-700 border border-purple-300";
      case 'swipe':
        return "bg-blue-100 text-blue-700 border border-blue-300";
      case 'credit':
        return "bg-orange-100 text-orange-700 border border-orange-300";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-300";
    }
  };
  
  // Function to render the payment flow with badges
  const renderPaymentFlow = () => {
    // If no payment history available, just show current payment mode
    if ((!paymentHistorySupported || !paymentHistory.length) && booking.payment_mode !== 'credit') {
      return (
        <div className="flex flex-col items-center">
          <Badge className={`px-3 py-1.5 text-sm font-medium ${getPaymentBadgeColor(booking.payment_mode)}`}>
            {formatPaymentMode(booking.payment_mode)}
            
          </Badge>
          
          {booking.payment_timestamp && (
            <div className="text-xs text-gray-600 mt-1">
              {format(new Date(booking.payment_timestamp), "PPP")}
              <br/>
              {format(new Date(booking.payment_timestamp), "hh:mm a")}
            </div>
          )}
        </div>
      );
    }
    
    // If it's a credit booking with payment history or has been paid
    if (booking.payment_mode === 'credit' || (lastPayment && booking.payment_mode !== 'credit')) {
      return (
        <div className="flex flex-col items-center space-y-2">
          {/* First show the original credit badge */}
          <div className="flex flex-col items-center">
            <Badge className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 border border-red-300">
              Credit
            </Badge>
            <div className="text-xs text-gray-600 mt-1">
              {booking.completed_at ? format(new Date(booking.completed_at), "PPP p") : ""}
            </div>
          </div>
          
          {/* If it's been paid, show the arrow and the payment badge */}
          {booking.payment_mode !== 'credit' && (
            <>
              <ArrowDownIcon className="h-5 w-5 text-gray-400" />
              <div className="flex flex-col items-center">
                <Badge className={`px-3 py-1.5 text-sm font-medium ${getPaymentBadgeColor(booking.payment_mode)}`}>
                  {formatPaymentMode(booking.payment_mode)}
                </Badge>
                {booking.payment_timestamp && (
                  <div className="text-xs text-gray-600 mt-1">
                    {format(new Date(booking.payment_timestamp), "PPP p")}
              
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* If it's still on credit but has payment button, show it */}
          {booking.payment_mode === 'credit' && (
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-2 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>Record Payment</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Update payment status for this credit booking
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="payment-mode" className="block mb-2">
                    Payment Mode
                  </Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="swipe">Card/Swipe</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">
                      Amount to be paid: ₹{totalBill}
                    </p>
                  </div>
                  
                  {!paymentHistorySupported && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-700">
                        Note: Payment history tracking is not yet set up in the database. 
                        The current payment will still be recorded, but detailed payment history will not be available.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePaymentSubmit} 
                    disabled={processingPayment || !paymentMode}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing
                      </>
                    ) : (
                      "Confirm Payment"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      );
    }
    
    // Default case - just show the current payment mode
    return (
      <div className="flex flex-col items-center">
        <Badge className={`px-3 py-1.5 text-sm font-medium ${getPaymentBadgeColor(booking.payment_mode)}`}>
          {formatPaymentMode(booking.payment_mode)}
        </Badge>
        
        {booking.payment_timestamp && (
          <div className="text-xs text-gray-600 mt-1">
            {format(new Date(booking.payment_timestamp), "PPP")}
            <br/>
            {format(new Date(booking.payment_timestamp), "hh:mm a")}
          </div>
        )}
      </div>
    );
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
            <Card className="bg-gray-50 p-4 rounded-lg">
              <CardContent>
                <h3 className="font-semibold text-lg text-primary mb-3">Personal Information</h3>
                <div className="flex items-center space-x-2 mb-3">
                  <User className="h-5 w-5 text-primary" />
                  <span>{booking.customer_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>{booking.contact_number}</span>
                </div>
              </CardContent>
            </Card>

            {/* Pet Information */}
            <Card className="bg-gray-50 p-4 rounded-lg">
              <CardContent>
                <h3 className="font-semibold text-lg text-primary mb-3">Pet Information</h3>
                <div className="flex items-center space-x-2 mb-3">
                  <DogIcon className="h-5 w-5 text-primary" />
                  <span>{booking.dog_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Paw className="h-5 w-5 text-primary" />
                  <span>{booking.dog_breed}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shop Information */}
            <Card className="bg-gray-50 p-4 rounded-lg">
              <CardContent>
                <h3 className="font-semibold text-lg text-primary mb-3">Shop Details</h3>
                <div className="flex items-center space-x-2 mb-3">
                  <Store className="h-5 w-5 text-primary" />
                  <span>{booking.shop_name || "N/A"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-primary" />
                  <span>{booking.groomer_name || " "}</span>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Details */}
            <Card className="bg-gray-50 p-4 rounded-lg lg:col-span-2">
              <CardContent>
                <h3 className="font-semibold text-lg text-primary mb-3">Appointment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-primary" />
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
              </CardContent>
            </Card>

            {/* Status and Payment */}
            <Card className="bg-gray-50 p-4 rounded-lg">
              <CardContent className="flex flex-col items-center justify-center">
                <h3 className="font-semibold text-lg text-primary mb-3">Booking Status</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${booking.status === "pending" ? "bg-yellow-200 text-yellow-700 border border-yellow-300" : booking.status === "checked_in" ? "bg-green-200 text-green-700 border border-green-300" : booking.status === "progressing" ? "bg-blue-200 text-blue-700 border border-blue-300" : booking.status === "completed" ? "bg-green-200 text-green-700 border border-green-300" : booking.status === "canceled" || booking.status === "cancelled" ? "bg-red-200 text-red-700 border border-red-300" : "bg-gray-200 text-gray-700 border border-gray-300"}`}>
                    {booking.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                <h3 className="font-semibold text-lg text-primary mb-3">Payment Status</h3>
                <div className="flex flex-col items-center">
                  {renderPaymentFlow()}
                  
                  
                </div>
              </CardContent>
            </Card>
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
              <Table className="border rounded-lg overflow-hidden">
                  <TableHeader className="bg-primary">
                    <TableRow>
                      <TableHead className="font-semibold text-primary-foreground">Service</TableHead>
                      <TableHead className="font-semibold text-primary-foreground">Details</TableHead>
                      <TableHead className="text-right font-semibold text-primary-foreground">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceDetails.map((service, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-800">{service.name}</TableCell>
                        <TableCell>
                          {service.input_value && <div className="text-sm mb-1 text-gray-600">Input: {service.input_value}</div>}
                          {service.care_tip && <div className="text-sm text-gray-500">Care Tip: {service.care_tip}</div>}
                        </TableCell>
                        <TableCell className="text-right text-gray-800">₹{service.price}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50">
                      <TableCell className="font-bold text-gray-900">Total</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold text-gray-900">
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
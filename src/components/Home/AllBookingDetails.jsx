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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";

export default function AllBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      toast.error(`Error fetching booking details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

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

  return (
    <Card className="max-w-4xl mx-auto mt-8">
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
        <CardDescription>Review this booking's details</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Label className="font-semibold">Customer Name:</Label>
              <span>{booking.customer_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="font-semibold">Contact Number:</Label>
              <span>{booking.contact_number}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="font-semibold">Dog Name:</Label>
              <span>{booking.dog_name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="font-semibold">Dog Breed:</Label>
              <span>{booking.dog_breed}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Label className="font-semibold">Booking Date:</Label>
              <span>{format(new Date(booking.booking_date), "PPP")}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="font-semibold">Time Slot:</Label>
              <span>
                {booking.slot_time
                  ? format(parse(booking.slot_time, "HH:mm:ss", new Date()), "hh:mm a")
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="font-semibold">Sub-Time Slot:</Label>
              <span>
                {booking.sub_time_slots?.description ||
                  (booking.sub_time_slots?.slot_number
                    ? `Slot ${booking.sub_time_slots.slot_number}`
                    : "N/A")}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="font-semibold">Status:</Label>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {booking.status.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end p-4">
        <Button
          variant="success"
          onClick={() => navigate("/all-bookings")}
          className="flex items-center space-x-2"
        >
          <ArrowRight className="h-4 w-4" />
          <span>View More</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

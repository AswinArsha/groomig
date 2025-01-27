// src/components/Bookings/ManageTimeSlotsPage.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddTimeSlotForm from "../Bookings/AddTimeSlotForm";
import TimeSlotList from "../Bookings/TimeSlotList";

export default function ManageTimeSlotsPage({ onSlotAdded }) {
  const navigate = useNavigate();
  
  return (
    <div className="">
      {/* Back Button */}
      <Button
        variant="outline"
        className="mb-6 flex items-center space-x-2"
        onClick={() => navigate(-1)} // Navigates back to the previous page
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </Button>
      
      {/* Manage Time Slots Content */}
      <div className="space-y-6">
      {/* Form to add a new time slot */}
      <AddTimeSlotForm onSlotAdded={onSlotAdded} />
      {/* List of existing time slots */}
      <TimeSlotList />
    </div>
    </div>
  );
}

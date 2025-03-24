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
    <div >

      
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

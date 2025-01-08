// src/components/Bookings/ManageTimeSlots.jsx
import React from "react";
import AddTimeSlotForm from "../Bookings/AddTimeSlotForm";
import TimeSlotList from "../Bookings/TimeSlotList";

export default function ManageTimeSlots({ onSlotAdded }) {
  return (
    <div className="space-y-6">
      {/* Form to add a new time slot */}
      <AddTimeSlotForm onSlotAdded={onSlotAdded} />
      {/* List of existing time slots */}
      <TimeSlotList />
    </div>
  );
}

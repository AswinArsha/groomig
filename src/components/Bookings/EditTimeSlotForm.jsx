// src/components/Bookings/EditTimeSlotForm.jsx
import React, { useState } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import TimePicker from "./TimePicker"; // Import the TimePicker component

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function EditTimeSlotForm({ slot, onSave, onCancel }) {
  // State for main time slot
  const [startTime, setStartTime] = useState(slot.start_time);
  const [repeatAllDays, setRepeatAllDays] = useState(slot.repeat_all_days);
  const [specificDays, setSpecificDays] = useState(slot.specific_days || []);

  // State for sub-time slots
  const [subSlots, setSubSlots] = useState(slot.sub_time_slots || []);

  // Handle adding a new sub-time slot
  const handleAddSubSlot = () => {
    setSubSlots([...subSlots, { slot_number: subSlots.length + 1, description: "" }]);
  };

  // Handle removing a sub-time slot
  const handleRemoveSubSlot = (index) => {
    const updatedSubSlots = subSlots.filter((_, i) => i !== index);
    // Reassign slot numbers
    const reassignedSubSlots = updatedSubSlots.map((s, i) => ({
      ...s,
      slot_number: i + 1,
    }));
    setSubSlots(reassignedSubSlots);
  };

  // Handle changes in sub-time slot descriptions
  const handleSubSlotChange = (index, field, value) => {
    const updatedSubSlots = subSlots.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    setSubSlots(updatedSubSlots);
  };

  // Callback to receive formatted time from TimePicker
  const handleTimeSelect = (formattedTime) => {
    setStartTime(formattedTime);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate inputs
    if (!startTime) {
      toast.error("Please select a time.");
      return;
    }

    // Prepare data for main time slot
    const updatedMainSlot = {
      id: slot.id,
      start_time: startTime, // "HH:MM:00" format
      repeat_all_days: repeatAllDays,
      specific_days: repeatAllDays ? null : specificDays,
      sub_time_slots: subSlots,
    };

    try {
      // Update main time slot
      const { error: mainSlotError } = await supabase
        .from("time_slots")
        .update({
          start_time: updatedMainSlot.start_time,
          repeat_all_days: updatedMainSlot.repeat_all_days,
          specific_days: updatedMainSlot.specific_days,
        })
        .eq("id", updatedMainSlot.id);

      if (mainSlotError) throw mainSlotError;

      // Delete existing sub-time slots
      const { error: deleteError } = await supabase
        .from("sub_time_slots")
        .delete()
        .eq("time_slot_id", updatedMainSlot.id);

      if (deleteError) throw deleteError;

      // Insert updated sub-time slots
      const newSubSlots = updatedMainSlot.sub_time_slots.map((s) => ({
        time_slot_id: updatedMainSlot.id,
        slot_number: s.slot_number,
        description: s.description || null,
      }));

      const { error: insertError } = await supabase
        .from("sub_time_slots")
        .insert(newSubSlots);

      if (insertError) throw insertError;

      toast.success("Time slot updated!");
      onSave(updatedMainSlot); // Pass the updated slot to onSave
    } catch (error) {
      toast.error(`Error updating time slot: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Time Picker */}
      <div className="space-y-2">
    <TimePicker onTimeSelect={handleTimeSelect} initialTime={slot.start_time} />
       
      </div>

      {/* Sub-Time Slots */}
      <div className="space-y-4">
        <Label>Sub-Time Slots</Label>
        {subSlots.map((subSlot, index) => (
          <div
            key={index}
            className="flex items-center space-x-4"
          >
            <span className="text-sm font-medium text-gray-700">Slot {subSlot.slot_number}:</span>
            <Input
              type="text"
              placeholder="Description"
              value={subSlot.description}
              onChange={(e) => handleSubSlotChange(index, "description", e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
            />
            {subSlots.length > 1 && (
              <Button
                type="button"
                variant="destructive"
                className="h-8 w-8 flex items-center justify-center p-1"
                onClick={() => handleRemoveSubSlot(index)}
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" onClick={handleAddSubSlot}>
          Add Sub-Time Slot
        </Button>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
       
     
        <Button type="submit">
          Save 
        </Button>
      </div>
    </form>
  );
}

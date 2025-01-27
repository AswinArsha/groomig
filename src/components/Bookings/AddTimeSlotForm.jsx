// src/components/Bookings/AddTimeSlotForm.jsx
import React, { useState } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import toast from "react-hot-toast";
import { Trash2, Plus } from "lucide-react";
import TimePicker from "./TimePicker";

export default function AddTimeSlotForm({ onSlotAdded }) {
  const [startTime, setStartTime] = useState("");
  const [subSlots, setSubSlots] = useState([{ slot_number: 1, description: "" }]);

  const handleAddSubSlot = () => {
    setSubSlots([...subSlots, { slot_number: subSlots.length + 1, description: "" }]);
  };

  const handleRemoveSubSlot = (index) => {
    const updatedSubSlots = subSlots.filter((_, i) => i !== index);
    const reassignedSubSlots = updatedSubSlots.map((slot, i) => ({
      ...slot,
      slot_number: i + 1,
    }));
    setSubSlots(reassignedSubSlots);
  };

  const handleSubSlotChange = (index, field, value) => {
    const updatedSubSlots = subSlots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot));
    setSubSlots(updatedSubSlots);
  };

  const handleTimeSelect = (formattedTime) => {
    setStartTime(formattedTime);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startTime) {
      toast.error("Please select a time.");
      return;
    }

    const formattedStartTime = startTime; // "HH:MM:00"

    const mainTimeSlot = {
      start_time: formattedStartTime,
      repeat_all_days: true,
      specific_days: null,
    };

    try {
      const { data: mainSlotData, error: mainSlotError } = await supabase
        .from("time_slots")
        .insert([mainTimeSlot])
        .select()
        .single();

      if (mainSlotError) throw mainSlotError;

      const subTimeSlots = subSlots.map((slot) => ({
        time_slot_id: mainSlotData.id,
        slot_number: slot.slot_number,
        description: slot.description || null,
      }));

      const { error: subSlotsError } = await supabase.from("sub_time_slots").insert(subTimeSlots);

      if (subSlotsError) throw subSlotsError;

      toast.success("Time slot and sub-slots added successfully!");
      setStartTime("");
      setSubSlots([{ slot_number: 1, description: "" }]);
      if (onSlotAdded) onSlotAdded();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Add Time Slot</CardTitle>
        <CardDescription>Set up a new time slot with sub-slots for your schedule</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:space-x-14">
            {/* Time Picker */}
            <div className="flex-1">
            
              <TimePicker onTimeSelect={handleTimeSelect} />
              
            </div>

            {/* Sub-Time Slots */}
            <div className="flex-1 space-y-4">
              <Label className="text-lg font-semibold">Sub-Time Slots</Label>
              {subSlots.map((slot, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2"
                >
                  <span className="min-w-[60px] font-medium">Slot {slot.slot_number}:</span>
                  <Input
                    type="text"
                    placeholder="Description"
                    value={slot.description}
                    onChange={(e) => handleSubSlotChange(index, "description", e.target.value)}
                    className="flex-grow"
                  />
                  {subSlots.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemoveSubSlot(index)}
                      className="mt-2 sm:mt-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" onClick={handleAddSubSlot} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Add Sub-Time Slot
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full">
            Add Time Slot
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

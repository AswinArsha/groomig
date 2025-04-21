// src/components/Bookings/EditTimeSlotForm.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import TimePicker from "./TimePicker";
import { Checkbox } from "@/components/ui/checkbox";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export default function EditTimeSlotForm({ slot, onSave, onCancel }) {
  // State for main time slot
  const [startTime, setStartTime] = useState(slot.start_time);
  const [repeatAllDays, setRepeatAllDays] = useState(slot.repeat_all_days);
  const [selectedDays, setSelectedDays] = useState(slot.specific_days || WEEKDAYS);
  // Use an array for selected shops (initializing with slot.shop_ids)
  const [selectedShops, setSelectedShops] = useState(slot.shop_ids || []);
  // Fetch available shops
  const [shops, setShops] = useState([]);

  useEffect(() => {
    const fetchShops = async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(`Error fetching shops: ${error.message}`);
      } else {
        setShops(data || []);
      }
    };
    fetchShops();
  }, []);

  // State for sub-time slots
  const [subSlots, setSubSlots] = useState(slot.sub_time_slots || []);

  const handleAddSubSlot = () => {
    setSubSlots([...subSlots, { slot_number: subSlots.length + 1, description: "" }]);
  };

  const handleRemoveSubSlot = (index) => {
    const updatedSubSlots = subSlots.filter((_, i) => i !== index);
    const reassignedSubSlots = updatedSubSlots.map((s, i) => ({
      ...s,
      slot_number: i + 1,
    }));
    setSubSlots(reassignedSubSlots);
  };

  const handleSubSlotChange = (index, field, value) => {
    const updatedSubSlots = subSlots.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    );
    setSubSlots(updatedSubSlots);
  };

  const handleTimeSelect = (formattedTime) => {
    setStartTime(formattedTime);
  };

  // Toggle shop selection in the multi-select list
  const toggleShopSelection = (shopId) => {
    if (selectedShops.includes(shopId)) {
      setSelectedShops(selectedShops.filter((id) => id !== shopId));
    } else {
      setSelectedShops([...selectedShops, shopId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startTime) {
      toast.error("Please select a time.");
      return;
    }
    if (selectedShops.length === 0) {
      toast.error("Please select at least one shop.");
      return;
    }

    const updatedMainSlot = {
      id: slot.id,
      start_time: startTime,
      repeat_all_days: repeatAllDays,
      specific_days: repeatAllDays ? null : specificDays,
      shop_ids: selectedShops,
      sub_time_slots: subSlots,
    };

    try {
      const { error: mainSlotError } = await supabase
        .from("time_slots")
        .update({
          start_time: updatedMainSlot.start_time,
          repeat_all_days: repeatAllDays,
          specific_days: repeatAllDays ? null : selectedDays,
          shop_ids: updatedMainSlot.shop_ids,
        })
        .eq("id", updatedMainSlot.id);

      if (mainSlotError) throw mainSlotError;

      const { error: deleteError } = await supabase
        .from("sub_time_slots")
        .delete()
        .eq("time_slot_id", updatedMainSlot.id);

      if (deleteError) throw deleteError;

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
      onSave(updatedMainSlot);
    } catch (error) {
      toast.error(`Error updating time slot: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 px-4">
      {/* Use a single-column layout on mobile and two columns on md+ screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Time Picker and Shop Selection */}
        <div className="space-y-6">
          {/* Time Picker */}
          <div className="space-y-2">
            <TimePicker onTimeSelect={handleTimeSelect} initialTime={slot.start_time} />
          </div>

          {/* Week Days Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="repeat-all-days"
                checked={repeatAllDays}
                onCheckedChange={(checked) => {
                  setRepeatAllDays(checked);
                  if (checked) {
                    setSelectedDays(WEEKDAYS);
                  }
                }}
              />
              <Label
                htmlFor="repeat-all-days"
                className="text-sm font-medium leading-none cursor-pointer select-none"
              >
                Repeat All Days
              </Label>
            </div>

            {!repeatAllDays && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`day-${day}`}
                      checked={selectedDays.includes(day)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedDays([...selectedDays, day]);
                        } else {
                          setSelectedDays(selectedDays.filter((d) => d !== day));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`day-${day}`}
                      className="text-sm font-medium leading-none cursor-pointer select-none"
                    >
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shop Multi-Select with Shadcn Checkbox */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select Shops</Label>
            {/* On extra-small screens, show one column; on small and above, two columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shops.map((shop) => (
                <div key={shop.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`shop-${shop.id}`}
                    checked={selectedShops.includes(shop.id)}
                    onCheckedChange={() => toggleShopSelection(shop.id)}
                  />
                  <Label
                    htmlFor={`shop-${shop.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {shop.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column - Sub-Time Slots */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Sub-Time Slots</Label>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 ">
            {subSlots.map((subSlot, index) => (
              <div key={index} className="flex items-center space-x-4 bg-secondary/20 p-3 rounded-lg">
                <span className="text-sm font-medium min-w-[60px]">Slot {subSlot.slot_number}:</span>
                <Input
                  type="text"
                  placeholder="Description"
                  value={subSlot.description}
                  onChange={(e) => handleSubSlotChange(index, "description", e.target.value)}
                  className="flex-1"
                />
                {subSlots.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => handleRemoveSubSlot(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={handleAddSubSlot} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Sub-Time Slot
          </Button>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}

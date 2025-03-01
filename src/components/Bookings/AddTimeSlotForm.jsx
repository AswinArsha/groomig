// src/components/Bookings/AddTimeSlotForm.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import TimePicker from "./TimePicker";
import { Checkbox } from "@/components/ui/checkbox";

export default function AddTimeSlotForm({ onSlotAdded }) {
  const [startTime, setStartTime] = useState("");
  const [subSlots, setSubSlots] = useState([{ slot_number: 1, description: "" }]);
  
  // New state for shops and multi-select (selectedShops is an array of shop IDs)
  const [shops, setShops] = useState([]);
  const [selectedShops, setSelectedShops] = useState([]);

  // Fetch available shops from Supabase
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
    const updatedSubSlots = subSlots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    setSubSlots(updatedSubSlots);
  };

  const handleTimeSelect = (formattedTime) => {
    setStartTime(formattedTime);
  };

  // Toggle shop selection when a checkbox is clicked
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

    const formattedStartTime = startTime; // "HH:MM:00" format

    const mainTimeSlot = {
      start_time: formattedStartTime,
      repeat_all_days: true,
      specific_days: null,
      shop_ids: selectedShops, // store selected shops as an array
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
      setSelectedShops([]);
      if (onSlotAdded) onSlotAdded();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Add Time Slot</CardTitle>
        <CardDescription>Set up a new time slot with sub-slots for your schedule</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Time Picker and Shop Selection */}
            <div className="space-y-6">
              {/* Time Picker */}
              <div className="space-y-2">
                <TimePicker onTimeSelect={handleTimeSelect} />
              </div>

              {/* Shop Multi-Select */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Shops</Label>
                <div className="grid grid-cols-2 gap-4">
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
              <Label className="text-lg font-semibold">Sub-Time Slots</Label>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4">
                {subSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 bg-secondary/20 p-3 rounded-lg"
                  >
                    <span className="text-sm font-medium min-w-[60px]">Slot {slot.slot_number}:</span>
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
                       
                        onClick={() => handleRemoveSubSlot(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" onClick={handleAddSubSlot} variant="outline" className="w-full">
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

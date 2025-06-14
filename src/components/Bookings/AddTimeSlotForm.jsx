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

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export default function AddTimeSlotForm({ onSlotAdded }) {
  const [startTime, setStartTime] = useState("");
  const [subSlots, setSubSlots] = useState([{ slot_number: 1, description: "" }]);
  const [repeatAllDays, setRepeatAllDays] = useState(true);
  const [selectedDays, setSelectedDays] = useState(WEEKDAYS);
  
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
    
    // Get organization_id from user session
    const storedSession = localStorage.getItem('userSession');
    if (!storedSession) {
      toast.error("User session not found. Please log in again.");
      return;
    }
    
    const { organization_id } = JSON.parse(storedSession);
    if (!organization_id) {
      toast.error("Organization information not found. Please log in again.");
      return;
    }

    const formattedStartTime = startTime; // "HH:MM:00" format

    const mainTimeSlot = {
      start_time: formattedStartTime,
      repeat_all_days: repeatAllDays,
      specific_days: repeatAllDays ? null : selectedDays,
      shop_ids: selectedShops, // store selected shops as an array
      organization_id: organization_id // Add organization_id to associate with correct organization
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
        organization_id: organization_id // Add organization_id to each sub-time slot
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
    <Card className="w-full mx-auto border-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold">Add Time Slot</CardTitle>
        <CardDescription className="hidden md:block">Set up a new time slot with sub-slots for your schedule</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Time Picker and Shop Selection */}
            <div className="space-y-8">
              {/* Time Picker */}
              <div className="space-y-3">
                <TimePicker onTimeSelect={handleTimeSelect} />
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
               <fieldset className="space-y-4">
              
               <div className="flex gap-2">
                 {WEEKDAYS.map((day) => (
                   <div key={day} className="relative w-9 h-9">
                     {/* 1. The actual checkbox, hidden but still clickable */}
                     <input
                       type="checkbox"
                       id={`day-${day}`}
                       className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       checked={selectedDays.includes(day)}
                       onChange={(e) => {
                         const checked = e.target.checked;
                         setSelectedDays(checked
                           ? [...selectedDays, day]
                           : selectedDays.filter((d) => d !== day)
                         );
                       }}
                     />
             
                     {/* 2. The visible circle that reflects checked state */}
                     <label
                       htmlFor={`day-${day}`}
                       className="flex items-center justify-center w-full h-full rounded-full border border-input text-sm font-medium transition-colors
                                  peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground"
                     >
                       {day.slice(0, 3)}
                     </label>
                   </div>
                 ))}
               </div>
             </fieldset>
             
                )}
              </div>

              {/* Shop Multi-Select */}
              <div className="space-y-4">
                <Label className="text-base font-semibold block mb-3">Select Shops</Label>
                <div className="grid grid-cols-2 gap-4">
                  {shops.map((shop) => (
                    <div 
                      key={shop.id} 
                      className="flex items-center space-x-3 p-2 rounded-md transition-colors hover:bg-secondary/10"
                    >
                      <Checkbox
                        id={`shop-${shop.id}`}
                        checked={selectedShops.includes(shop.id)}
                        onCheckedChange={() => toggleShopSelection(shop.id)}
                        className="data-[state=checked]:bg-primary"
                      />
                      <Label
                        htmlFor={`shop-${shop.id}`}
                        className="text-sm font-medium leading-none cursor-pointer select-none"
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
              <Label className="text-lg font-semibold block mb-3">Sub-Time Slots</Label>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin">
                {subSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 bg-secondary/10 p-4 rounded-lg transition-all hover:bg-secondary/20"
                  >
                    <span className="text-sm font-medium min-w-[70px]">Slot {slot.slot_number}:</span>
                    <Input
                      type="text"
                      placeholder="Description"
                      value={slot.description}
                      onChange={(e) => handleSubSlotChange(index, "description", e.target.value)}
                      className="flex-grow focus:ring-2 focus:ring-primary/20"
                    />
                    {subSlots.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleRemoveSubSlot(index)}
                        className="hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button 
                type="button" 
                onClick={handleAddSubSlot} 
                variant="outline" 
                className="w-full hover:bg-secondary/10 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Sub-Time Slot
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 transition-colors"
          >
            Add Time Slot
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

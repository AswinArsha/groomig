// src/components/Bookings/AddTimeSlotForm.jsx
import React, { useState } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import toast from 'react-hot-toast';

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export default function AddTimeSlotForm({ onSlotAdded }) {
  const [time, setTime] = useState("");
  const [repeatAllDays, setRepeatAllDays] = useState(true);
  const [selectedDays, setSelectedDays] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("time_slots").insert([
      {
        start_time: time,  // Using start_time column as single time field
        repeat_all_days: repeatAllDays,
        specific_days: repeatAllDays ? null : selectedDays,
      },
    ]);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      setTime("");
      setRepeatAllDays(true);
      setSelectedDays([]);
      onSlotAdded();
      toast.success('Time slot added successfully!');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Set up a new time slot for your schedule
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="repeatAllDays"
              checked={repeatAllDays}
              onCheckedChange={setRepeatAllDays}
            />
            <Label htmlFor="repeatAllDays">Repeat on All Days</Label>
          </div>
          {!repeatAllDays && (
            <div className="space-y-2">
              <Label>Select Specific Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={selectedDays.includes(day)}
                      onCheckedChange={(checked) => {
                        setSelectedDays(
                          checked
                            ? [...selectedDays, day]
                            : selectedDays.filter((d) => d !== day)
                        );
                      }}
                    />
                    <Label htmlFor={day}>{day}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button type="submit" className="w-full">
            Add Time Slot
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

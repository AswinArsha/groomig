import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Clock, Calendar, Trash2, Edit2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function TimeSlotList() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState(null);

  const fetchSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("time_slots")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      setSlots(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();

    // Real-time subscription
    const channel = supabase
      .channel("realtime:time_slots")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "time_slots" },
        (payload) => {
       
          setSlots((prevSlots) => [payload.new, ...prevSlots]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "time_slots" },
        (payload) => {
  
          setSlots((prevSlots) => prevSlots.filter((slot) => slot.id !== payload.old.id));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "time_slots" },
        (payload) => {
  
          setSlots((prevSlots) =>
            prevSlots.map((slot) =>
              slot.id === payload.new.id ? { ...slot, ...payload.new } : slot
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id) => {
    const { error } = await supabase.from("time_slots").delete().eq("id", id);
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success("Time slot deleted successfully!");
    }
  };

  const handleEdit = async (slot) => {
    const { error } = await supabase
      .from("time_slots")
      .update({
        start_time: slot.start_time,
        repeat_all_days: slot.repeat_all_days,
        specific_days: slot.specific_days,
      })
      .eq("id", slot.id);

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success("Time slot updated successfully!");
    }
    setEditingSlot(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardDescription>Existing Time Slots</CardDescription>
      </CardHeader>
      <CardContent className="-p-6">
        {slots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No time slots found.</p>
            <p className="text-sm text-muted-foreground mt-2">Add a time slot to get started.</p>
          </div>
        ) : (
          <ScrollArea className="h-[19rem] p-4">
            <ul className="space-y-4">
              {slots.map((slot) => (
                <li key={slot.id} className="group">
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <p className="font-medium text-lg">{slot.start_time.split(":").slice(0, 2).join(":")}</p>

                          </div>
                          <div className="flex items-start space-x-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {slot.repeat_all_days
                                ? "Repeats on all days"
                                : `Specific days: ${slot.specific_days?.join(", ")}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                className="flex-1 sm:flex-none"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSlot(slot)}
                              >
                                 <Edit2 className="h-4 w-4 mr-2" />
                              
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Edit Time Slot</DialogTitle>
                              </DialogHeader>
                              {editingSlot && (
                                <EditTimeSlotForm
                                  slot={editingSlot}
                                  onSave={handleEdit}
                                  onCancel={() => setEditingSlot(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            className="flex-1 sm:flex-none"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(slot.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                        
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    
    </Card>
  );
}

function EditTimeSlotForm({ slot, onSave, onCancel }) {
  const [editedSlot, setEditedSlot] = useState(slot);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedSlot);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="space-y-2">
        <Label htmlFor="time">Time</Label>
        <Input
          id="time"
          type="time"
          value={editedSlot.start_time}
          onChange={(e) =>
            setEditedSlot({ ...editedSlot, start_time: e.target.value })
          }
          required
          className="w-full"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="repeatAllDays"
          checked={editedSlot.repeat_all_days}
          onCheckedChange={(checked) =>
            setEditedSlot({ ...editedSlot, repeat_all_days: checked })
          }
        />
        <Label htmlFor="repeatAllDays">Repeat on All Days</Label>
      </div>

      {!editedSlot.repeat_all_days && (
        <div className="space-y-3">
          <Label>Select Specific Days</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted"
              >
                <Checkbox
                  id={day}
                  checked={editedSlot.specific_days?.includes(day)}
                  onCheckedChange={(checked) => {
                    const updatedDays = checked
                      ? [...(editedSlot.specific_days || []), day]
                      : editedSlot.specific_days?.filter((d) => d !== day) || [];
                    setEditedSlot({ ...editedSlot, specific_days: updatedDays });
                  }}
                />
                <Label htmlFor={day} className="flex-1 cursor-pointer">
                  {day}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button type="submit" className="w-full sm:w-auto">
          Save Changes
        </Button>
      </div>
    </form>
  );
}

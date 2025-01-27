// src/components/Bookings/TimeSlotList.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Loader2, Clock, Trash2, Edit2 } from "lucide-react";
import toast from "react-hot-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import EditTimeSlotForm from "./EditTimeSlotForm";

export default function TimeSlotList() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("time_slots")
      .select(`
        *,
        sub_time_slots (
          *
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Error fetching time slots: ${error.message}`);
    } else {
      setSlots(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();

    const channel = supabase
      .channel("realtime:time_slots")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "time_slots" },
        () => fetchSlots()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "time_slots" },
        () => fetchSlots()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "time_slots" },
        () => fetchSlots()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id) => {
    const { error } = await supabase.from("time_slots").delete().eq("id", id);
    if (error) {
      toast.error(`Error deleting time slot: ${error.message}`);
    } else {
      toast.success("Time slot deleted successfully!");
      fetchSlots();
    }
    setDeleteId(null);
  };

  const handleEdit = async (updatedSlot) => {
    try {
      // Update main time slot
      const { error: mainSlotError } = await supabase
        .from("time_slots")
        .update({
          start_time: updatedSlot.start_time,
          repeat_all_days: updatedSlot.repeat_all_days,
          specific_days: updatedSlot.specific_days,
        })
        .eq("id", updatedSlot.id);

      if (mainSlotError) throw mainSlotError;

      // Delete existing sub-time slots
      const { error: deleteError } = await supabase
        .from("sub_time_slots")
        .delete()
        .eq("time_slot_id", updatedSlot.id);

      if (deleteError) throw deleteError;

      // Insert updated sub-time slots
      const newSubSlots = updatedSlot.sub_time_slots.map((s) => ({
        time_slot_id: updatedSlot.id,
        slot_number: s.slot_number,
        description: s.description || null,
      }));

      const { error: insertError } = await supabase
        .from("sub_time_slots")
        .insert(newSubSlots);

      if (insertError) throw insertError;

    
      setEditingSlot(null);
      fetchSlots();
    } catch (error) {
      toast.error(`Error updating time slot: ${error.message}`);
    }
  };

  const formatTimeDisplay = (time) => {
    const [hours, minutes, seconds] = time.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto ">
      <CardHeader>
        <CardDescription>Manage your time slots and their sub-slots.</CardDescription>
      </CardHeader>
      <CardContent>
        {slots.length === 0 ? (
          <div className="text-center ">
            <p className="text-muted-foreground">No time slots found.</p>
            <p className="text-sm text-muted-foreground ">
              Add a time slot to get started.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[24rem] ">
            <ul className="space-y-2">
              {slots.map((slot) => (
                <li key={slot.id}>
                  <Card className="shadow-md">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 p-3 rounded-full">
                            <Clock className="h-6 w-6 text-primary" />
                          </div>
                          <p className="font-medium text-xl">
                            {formatTimeDisplay(slot.start_time)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {/* Edit Button */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSlot(slot)}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
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
                          {/* Delete Button with Confirmation Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeleteId(slot.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this time slot? This will also
                                  delete all associated sub-time slots.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setDeleteId(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDelete(deleteId)}
                                >
                                  Delete
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="font-semibold">Sub-Time Slots</h4>
                        {slot.sub_time_slots && slot.sub_time_slots.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1">
                            {slot.sub_time_slots.map((subSlot) => (
                              <li key={subSlot.id} className="text-sm">
                                Slot {subSlot.slot_number}:{" "}
                                {subSlot.description || "No Description"}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No sub-time slots added.
                          </p>
                        )}
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

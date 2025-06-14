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
    
    // Get organization_id from user session
    const storedSession = localStorage.getItem('userSession');
    if (!storedSession) {
      toast.error("User session not found. Please log in again.");
      setLoading(false);
      return;
    }
    
    const { organization_id } = JSON.parse(storedSession);
    if (!organization_id) {
      toast.error("Organization information not found. Please log in again.");
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from("time_slots")
      .select(`
        *,
        sub_time_slots (
          *
        )
      `)
      .eq("organization_id", organization_id) // Filter by organization_id
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
    try {
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
      
      // Verify the time slot belongs to the organization before deleting
      const { data: slotData, error: slotError } = await supabase
        .from("time_slots")
        .select("*")
        .eq("id", id)
        .eq("organization_id", organization_id)
        .single();
        
      if (slotError || !slotData) {
        toast.error("You don't have permission to delete this time slot.");
        return;
      }
      
      // Delete the time slot
      const { error } = await supabase
        .from("time_slots")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization_id); // Add organization filter for extra security
      
      if (error) {
        toast.error(`Error deleting time slot: ${error.message}`);
      } else {
        toast.success("Time slot deleted successfully!");
        fetchSlots();
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setDeleteId(null);
    }
  };

  const handleEdit = async (updatedSlot) => {
    try {
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
      
      // Verify the time slot belongs to the organization before updating
      const { data: slotData, error: slotError } = await supabase
        .from("time_slots")
        .select("*")
        .eq("id", updatedSlot.id)
        .eq("organization_id", organization_id)
        .single();
        
      if (slotError || !slotData) {
        toast.error("You don't have permission to update this time slot.");
        return;
      }
      
      // Update main time slot
      const { error: mainSlotError } = await supabase
        .from("time_slots")
        .update({
          start_time: updatedSlot.start_time,
          repeat_all_days: updatedSlot.repeat_all_days,
          specific_days: updatedSlot.specific_days,
          shop_ids: updatedSlot.shop_ids,
          organization_id: organization_id // Ensure organization_id is maintained
        })
        .eq("id", updatedSlot.id)
        .eq("organization_id", organization_id); // Add organization filter for extra security

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
        organization_id: organization_id // Add organization_id to each sub-time slot
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
<div>
        {slots.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-lg mb-2">No time slots found.</p>
            <p className="text-sm text-muted-foreground">
              Add a time slot to get started.
            </p>
          </div>
        ) : (

            <div className="grid grid-cols-1  sm:grid-cols-2 lg:grid-cols-3 gap-4 -mt-2">
              {slots.map((slot) => (
                <div key={slot.id} className="aspect-square group">
                  <Card className="h-full transition-all duration-200  hover:border-primary/50">
                    <CardContent className="p-4 h-full flex flex-col justify-between relative">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2.5 rounded-full transition-colors group-hover:bg-primary/20">
                            <Clock className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-lg text-foreground/90 group-hover:text-foreground">
                              {formatTimeDisplay(slot.start_time)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {slot.sub_time_slots?.length || 0} sub-slots
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            Sub-Time Slots
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-xs font-normal">
                              {slot.sub_time_slots?.length || 0}
                            </span>
                          </h4>
                          {slot.sub_time_slots && slot.sub_time_slots.length > 0 ? (
                            <ul className="text-sm space-y-1.5 overflow-y-auto max-h-[120px] pr-2">
                              {slot.sub_time_slots.map((subSlot) => (
                                <li key={subSlot.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                  <span className="text-primary text-lg">•</span>
                                  <span className="text-foreground/80">Slot {subSlot.slot_number}: {subSlot.description || "No Description"}</span>
                                </li>
                              ))}                          
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground p-2 bg-muted/30 rounded-md">No sub-time slots added.</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingSlot(slot)}
                              className="flex-1 hover:border-primary hover:text-primary transition-colors"
                            >
                              <Edit2 className="h-4 w-4 mr-1.5" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[800px]">
                            <DialogHeader>
                     
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
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteId(slot.id)}
                              className="flex-1 opacity-90 hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4 mr-1.5" />
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
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
       
        )}
      </div>
  );
}

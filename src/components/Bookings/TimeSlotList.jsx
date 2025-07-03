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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Loader2, Clock, Trash2, Edit2 } from "lucide-react";
import toast from "react-hot-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import EditTimeSlotForm from "./EditTimeSlotForm";

export default function TimeSlotList() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editOpen, setEditOpen] = useState(false); // Added missing state
  const [deleteId, setDeleteId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  // Media query for responsive behavior
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
      setDeleteOpen(false);
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

      // Check for duplicate time only if the time has changed
      if (updatedSlot.start_time !== slotData.start_time) {
        const { data: duplicateData, error: duplicateError } = await supabase
          .from("time_slots")
          .select("id, start_time")
          .eq("organization_id", organization_id)
          .eq("start_time", updatedSlot.start_time)
          .neq("id", updatedSlot.id);

        if (duplicateError) {
          console.error("Error checking duplicate time:", duplicateError);
          toast.error("Error checking for duplicate time slots.");
          return;
        }

        if (duplicateData && duplicateData.length > 0) {
          const [hours, minutes] = updatedSlot.start_time.split(":").map(Number);
          const ampm = hours >= 12 ? "PM" : "AM";
          const displayHour = hours % 12 === 0 ? 12 : hours % 12;
          const formattedTime = `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
          
          toast.error(`A time slot for ${formattedTime} already exists. Please choose a different time.`);
          return;
        }
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

      toast.success("Time slot updated successfully!");
      setEditingSlot(null);
      setEditOpen(false); // Close the dialog after successful update
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

  // Edit Dialog/Drawer Component
  const EditTimeSlotComponent = ({ slot }) => {
    if (isDesktop) {
      return (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingSlot(slot);
                setEditOpen(true);
              }}
              className="flex-1 hover:border-primary hover:text-primary transition-colors"
            >
              <Edit2 className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Time Slot</DialogTitle>
              <DialogDescription>
                Make changes to your time slot here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            {editingSlot && (
              <EditTimeSlotForm
                slot={editingSlot}
                onSave={handleEdit}
                onCancel={() => {
                  setEditingSlot(null);
                  setEditOpen(false);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingSlot(slot);
              setEditOpen(true);
            }}
            className="flex-1 hover:border-primary hover:text-primary transition-colors"
          >
            <Edit2 className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader>
            <DrawerTitle>Edit Time Slot</DrawerTitle>
            <DrawerDescription className="hidden md:block">
              Make changes to your time slot here. Click save when you're done.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto">
            {editingSlot && (
              <EditTimeSlotForm
                slot={editingSlot}
                onSave={handleEdit}
                onCancel={() => {
                  setEditingSlot(null);
                  setEditOpen(false);
                }}
                className="pb-4"
              />
            )}
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline" onClick={() => {
                setEditingSlot(null);
                setEditOpen(false);
              }}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  };

  // Delete Dialog/Drawer Component
  const DeleteTimeSlotComponent = ({ slotId }) => {
    if (isDesktop) {
      return (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setDeleteId(slotId);
                setDeleteOpen(true);
              }}
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
                onClick={() => {
                  setDeleteId(null);
                  setDeleteOpen(false);
                }}
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
      );
    }

    return (
      <Drawer open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DrawerTrigger asChild>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              setDeleteId(slotId);
              setDeleteOpen(true);
            }}
            className="flex-1 opacity-90 hover:opacity-100"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Confirm Deletion</DrawerTitle>
            <DrawerDescription>
              Are you sure you want to delete this time slot? This will also
              delete all associated sub-time slots.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. This will permanently delete the time slot and all its sub-time slots.
            </p>
          </div>
          <DrawerFooter className="pt-2 flex flex-col gap-2">
            <Button
              variant="destructive"
              onClick={() => handleDelete(deleteId)}
              className="w-full"
            >
              Delete Time Slot
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" onClick={() => {
                setDeleteId(null);
                setDeleteOpen(false);
              }}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
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
        <div className="px-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => (
            <Card key={slot.id} className="flex flex-col h-full border overflow-hidden">
              {/* Header */}
              <div className="bg-primary/10 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="h-6 w-6 text-primary" />
                  <span className="text-lg font-semibold text-primary">
                    {formatTimeDisplay(slot.start_time)}
                  </span>
                </div>
                <span className="text-sm bg-primary/20 text-primary font-medium px-2 py-1 rounded-full">
                  {slot.sub_time_slots?.length ?? 0} sub-slots
                </span>
              </div>

              {/* Body */}
              <CardContent className="p-4 flex-1 flex flex-col">
                {slot.sub_time_slots && slot.sub_time_slots.length > 0 ? (
                  <ul className="flex-1 overflow-y-auto space-y-1 pr-2">
                    {slot.sub_time_slots.map((sub) => (
                      <li key={sub.id} className="flex items-center gap-2 py-1">
                        <span className="inline-flex items-center justify-center w-5 h-5 bg-primary text-white rounded-full text-xs">
                          {sub.slot_number}
                        </span>
                        <span className="text-sm text-foreground/80 truncate">
                          {sub.description || "No Description"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted rounded-md text-muted/70">
                    <Clock className="h-6 w-6 mb-1" />
                    <span className="text-sm">No sub-time slots added</span>
                  </div>
                )}
              </CardContent>

              {/* Footer with actions */}
              <div className="border-t px-4 py-3 flex justify-end gap-2 bg-muted/10">
                <EditTimeSlotComponent slot={slot} />
                <DeleteTimeSlotComponent slotId={slot.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
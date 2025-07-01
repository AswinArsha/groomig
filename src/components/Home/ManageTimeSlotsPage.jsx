// src/components/Bookings/ManageTimeSlotsPage.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddTimeSlotForm from "../Bookings/AddTimeSlotForm";
import TimeSlotList from "../Bookings/TimeSlotList";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export default function ManageTimeSlotsPage({ onSlotAdded }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSlotAdded = () => {
    setIsOpen(false);
    if (onSlotAdded) onSlotAdded();
  };

  return (
    <div>
      {/* Manage Time Slots Content */}
      <div className="space-y-6">
        {/* Add Time Slot Button with Dialog/Sheet */}
        {isMobile ? (
          <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>
              <Button className="mb-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                 <DrawerTitle>Add Time Slot</DrawerTitle>
              </DrawerHeader>
              <div className=" -mt-4 -mb-6">
                <AddTimeSlotForm onSlotAdded={handleSlotAdded} />
              </div>
              <div className="px-6 pb-4 pt-2 ">
                <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button onClick={() => setIsOpen(true)} className="mb-4">
              <Plus className="h-4 w-4 mr-2" />
              Add Time Slot
            </Button>
            <DialogContent className="max-w-3xl -p-4">
              
              <AddTimeSlotForm onSlotAdded={handleSlotAdded} />
            </DialogContent>
          </Dialog>
        )}
        {/* List of existing time slots */}
        <TimeSlotList />
      </div>
    </div>
  );
}

// src/components/Home.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BookingForm from "./Home/BookingForm"; 
import BookingTable from "./Home/BookingTable";
import AddTimeSlotForm from "./Bookings/AddTimeSlotForm";
import TimeSlotList from "./Bookings/TimeSlotList";

function Home() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  return (
    <div className="-mt-4  ">
      <div className="space-x-4">
      {/* New Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4" onClick={() => setDialogOpen(true)}>
            New Booking
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
          
          </DialogHeader>
          <BookingForm onSave={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Landscape Dialog for Managing Time Slots */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogTrigger asChild>
          <Button className="my-4" onClick={() => setManageDialogOpen(true)}>
            Manage Time Slots
          </Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Time Slots</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row sm:space-x-6">
            {/* Left side: Add Time Slot Form */}
            <div className="flex-1">
              <AddTimeSlotForm onSlotAdded={() => {}} />
            </div>
            {/* Right side: Existing Time Slots List */}
            <div className="flex-1">
              <TimeSlotList />
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
      {/* Booking Table */}
      <BookingTable  />
    </div>
  );
}

export default Home;

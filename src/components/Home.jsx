// src/components/Home.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import BookingForm from "./Home/BookingForm"; 
import BookingTable from "./Home/BookingTable";
import ManageTimeSlots from "./Home/ManageTimeSlots";  // Import the ManageTimeSlots component

function Home() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshList, setRefreshList] = useState(false);

  const handleSlotAdded = () => {
    setRefreshList(!refreshList);
  };

  return (
    <div className=" space-x-4">
      {/* New Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4" onClick={() => setDialogOpen(true)}>
            New Booking
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            {/* Optional header content */}
          </DialogHeader>
          <BookingForm onSave={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Add & Manage Time Slots Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button className="my-4">Add Time Slots</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add & Manage Time Slots</SheetTitle>
          </SheetHeader>
          {/* Render combined form and list */}
          <ManageTimeSlots onSlotAdded={handleSlotAdded} key={refreshList} />
        </SheetContent>
      </Sheet>

      {/* Booking Table */}
      <BookingTable />
    </div>
  );
}

export default Home;

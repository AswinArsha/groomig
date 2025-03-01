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
import { useNavigate } from "react-router-dom"; // Import useNavigate

function Home() {
  const navigate = useNavigate(); // Initialize useNavigate
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="-m-4">
      <div className="space-x-4 ml-4">
        {/* New Booking Dialog */}
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mb-4">
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              {/* Optional: Add a title if needed */}
            </DialogHeader>
            <BookingForm 
      onSuccess={() => setIsDialogOpen(false)}
           onSave={() => {}} />
          </DialogContent>
        </Dialog>

        <Button onClick={() => navigate("/all-bookings")}>
            View All Bookings
          </Button>
      </div>
      
      {/* Booking Table */}
      <BookingTable />
    </div>
  );
}

export default Home;
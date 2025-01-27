import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

function Bookings() {
  const [refreshList, setRefreshList] = useState(false);

  const handleSlotAdded = () => {
    setRefreshList(!refreshList);
  };

  return (
    <div>
      {/* Sheet for Add & Manage Time Slot */}
      <Sheet>
        <SheetTrigger asChild>
          <Button className="my-4">Add & Manage Time Slots</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add & Manage Time Slots</SheetTitle>
          </SheetHeader>
          {/* Render combined form and list */}
       
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default Bookings;

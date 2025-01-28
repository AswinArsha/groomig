// In the BookingTable component, modify the Edit Dialog section:

{/* Edit Button */}
<Dialog
  open={Boolean(editingBooking && editingBooking.id === booking.id)}
  onOpenChange={(open) => {
    if (!open) setEditingBooking(null);
  }}
>
  <DialogTrigger asChild>
    <Button
      size="sm"
      variant="outline"
      onClick={() => setEditingBooking(booking)}
    >
      <Edit2 className="h-4 w-4 mr-1" />
    </Button>
  </DialogTrigger>
  <DialogContent>
    {editingBooking && (
      <BookingForm
        booking={editingBooking}
        onSuccess={() => {
          setEditingBooking(null); // This will close the dialog
          fetchBookings(); // Refresh the table data
        }}
        onCancel={() => setEditingBooking(null)}
      />
    )}
  </DialogContent>
</Dialog>
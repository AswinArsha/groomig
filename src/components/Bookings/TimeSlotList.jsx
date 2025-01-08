
import React, { useState, useEffect } from "react"
import { supabase } from "../../supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Clock, Calendar } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

export default function TimeSlotList() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingSlot, setEditingSlot] = useState(null)

  const fetchSlots = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("time_slots")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      setSlots(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSlots()
  }, [])

  const handleDelete = async (id) => {
    const { error } = await supabase.from("time_slots").delete().eq("id", id)
    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      fetchSlots()
      toast.success("Time slot deleted successfully!")
    }
  }

  const handleEdit = async (slot) => {
    const { error } = await supabase
      .from("time_slots")
      .update({
        start_time: slot.start_time,
        end_time: slot.end_time,
        repeat_all_days: slot.repeat_all_days,
        specific_days: slot.specific_days,
      })
      .eq("id", slot.id)

    if (error) {
      toast.error(`Error: ${error.message}`)
    } else {
      fetchSlots()
      setEditingSlot(null)
      toast.success("Time slot updated successfully!")
    }
  }

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )

  return (
    <Card>
     
      <CardHeader>
        <CardTitle>Existing Time Slots</CardTitle>
      </CardHeader>
      <CardContent>
        {slots.length === 0 ? (
          <p className="text-center text-muted-foreground">No time slots found.</p>
        ) : (
          <ul className="space-y-4">
            {slots.map((slot) => (
              <li key={slot.id}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <p className="font-medium">
                            {slot.start_time} 
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <p className="text-sm text-muted-foreground">
                            {slot.repeat_all_days
                              ? "Repeats on all days"
                              : `Specific days: ${slot.specific_days?.join(", ")}`}
                          </p>
                        </div>
                      </div>
                      <div className="space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingSlot(slot)}
                            >
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
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
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(slot.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function EditTimeSlotForm({ slot, onSave, onCancel }) {
  const [editedSlot, setEditedSlot] = useState(slot);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editedSlot);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="time">Time</Label>
        <Input
          id="time"
          type="time"
          value={editedSlot.start_time} 
          onChange={(e) =>
            setEditedSlot({ ...editedSlot, start_time: e.target.value })
          }
          required
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
        <div className="space-y-2">
          <Label>Select Specific Days</Label>
          <div className="grid grid-cols-2 gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="flex items-center space-x-2">
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
                <Label htmlFor={day}>{day}</Label>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}


// src/components/Catalog/Staff.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch staff from Supabase
  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Error fetching staff: ${error.message}`);
    } else {
      setStaff(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const staffData = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      username: formData.get("username"),
      password: formData.get("password"), // In a real app, this should be properly hashed
    };

    try {
      if (editingStaff) {
        const { error } = await supabase
          .from("staff")
          .update(staffData)
          .eq("id", editingStaff.id);
        if (error) throw error;
        toast.success("Staff updated successfully!");
      } else {
        const { error } = await supabase.from("staff").insert([staffData]);
        if (error) throw error;
        toast.success("Staff added successfully!");
      }
      setDialogOpen(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handle staff deletion
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", staffToDelete.id);

      if (error) throw error;
      toast.success("Staff deleted successfully!");
      fetchStaff();
    } catch (error) {
      toast.error(`Error deleting staff: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    }
  };

  // Filter staff based on search term
  const filteredStaff = staff.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add New Staff
        </Button>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredStaff.length === 0 ? (
        <p className="text-center text-gray-500">No staff members found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member) => (
            <Card key={member.id}>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-gray-600">{member.phone}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingStaff(member);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setStaffToDelete(member);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for Adding/Editing Staff */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingStaff?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="number"
                defaultValue={editingStaff?.phone}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                defaultValue={editingStaff?.username}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue={editingStaff?.password}
                required={!editingStaff}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingStaff ? "Update" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the staff
              member's account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
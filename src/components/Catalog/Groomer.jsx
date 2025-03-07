import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 ,Search} from "lucide-react";

export default function Groomer() {
  const [groomers, setGroomers] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroomer, setEditingGroomer] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groomerToDelete, setGroomerToDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    address: "",
    shop_id: "",
  });

  // Fetch groomers and shops from Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch groomers with shop details
      const { data: groomersData, error: groomersError } = await supabase
        .from("groomers")
        .select(`*, shops(name)`)
        .order("created_at", { ascending: false });

      if (groomersError) throw groomersError;

      // Fetch shops for the select dropdown
      const { data: shopsData, error: shopsError } = await supabase
        .from("shops")
        .select("id, name")
        .order("name");

      if (shopsError) throw shopsError;

      setGroomers(groomersData || []);
      setShops(shopsData || []);
    } catch (error) {
      toast.error(`Error fetching data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleShopChange = (value) => {
    setFormData((prev) => ({ ...prev, shop_id: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.shop_id) {
        toast.error("Name and Shop are required!");
        return;
      }

      if (editingGroomer) {
        const { error } = await supabase
          .from("groomers")
          .update(formData)
          .eq("id", editingGroomer.id);

        if (error) throw error;
        toast.success("Groomer updated successfully!");
      } else {
        const { error } = await supabase.from("groomers").insert([formData]);
        if (error) throw error;
        toast.success("Groomer added successfully!");
      }

      setDialogOpen(false);
      setEditingGroomer(null);
      setFormData({
        name: "",
        phone_number: "",
        address: "",
        shop_id: "",
      });
      fetchData();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleEdit = (groomer) => {
    setEditingGroomer(groomer);
    setFormData({
      name: groomer.name,
      phone_number: groomer.phone_number || "",
      address: groomer.address || "",
      shop_id: groomer.shop_id,
    });
    setDialogOpen(true);
  };

  const handleDelete = (groomer) => {
    setGroomerToDelete(groomer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from("groomers")
        .delete()
        .eq("id", groomerToDelete.id);

      if (error) throw error;

      toast.success("Groomer deleted successfully!");
      fetchData();
    } catch (error) {
      toast.error(`Error deleting groomer: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setGroomerToDelete(null);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroomers = groomers.filter(groomer =>
    groomer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-8">
        <Button onClick={() => {
          setEditingGroomer(null);
          setFormData({
            name: "",
            phone_number: "",
            address: "",
            shop_id: "",
          });
          setDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Add New Groomer
        </Button>
        <div className="relative w-full sm:w-64">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search groomers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
           className="pl-10 w-full"
          />
          
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroomers.map((groomer) => (
          <Card key={groomer.id}>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-2">{groomer.name}</h3>
              {groomer.phone_number && (
                <p className="text-gray-600 mb-1">{groomer.phone_number}</p>
              )}
              {groomer.address && (
                <p className="text-gray-600 mb-1">{groomer.address}</p>
              )}
              <p className="text-gray-600">{groomer.shops.name}</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button size="sm" variant="outline" onClick={() => handleEdit(groomer)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(groomer)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Dialog for Adding/Editing Groomer */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroomer ? "Edit Groomer" : "Add New Groomer"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter groomer name"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone_number">Phone Number (Optional)</Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter address"
              />
            </div>
            <div>
              <Label htmlFor="shop">Shop *</Label>
              <Select
                value={formData.shop_id}
                onValueChange={handleShopChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingGroomer ? "Update" : "Add"} Groomer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Deletion Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the groomer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
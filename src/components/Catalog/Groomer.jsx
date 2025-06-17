import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter , CardTitle} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch groomers and shops from Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
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
      
      // Fetch groomers with shop details, filtered by organization_id
      const { data: groomersData, error: groomersError } = await supabase
        .from("groomers")
        .select(`*, shops(name)`)
        .eq("organization_id", organization_id)
        .order("created_at", { ascending: false });

      if (groomersError) throw groomersError;

      // Fetch shops for the select dropdown, filtered by organization_id
      const { data: shopsData, error: shopsError } = await supabase
        .from("shops")
        .select("id, name")
        .eq("organization_id", organization_id)
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
      
      // Add organization_id to the form data
      const groomerData = { ...formData, organization_id };

      if (editingGroomer) {
        // Verify the groomer belongs to the organization before updating
        const { data: groomerData, error: groomerError } = await supabase
          .from("groomers")
          .select("*")
          .eq("id", editingGroomer.id)
          .eq("organization_id", organization_id)
          .single();
          
        if (groomerError || !groomerData) {
          toast.error("You don't have permission to update this groomer.");
          return;
        }
        
        const { error } = await supabase
          .from("groomers")
          .update(groomerData)
          .eq("id", editingGroomer.id)
          .eq("organization_id", organization_id); // Add organization filter for extra security

        if (error) throw error;
        toast.success("Groomer updated successfully!");
      } else {
        const { error } = await supabase.from("groomers").insert([groomerData]);
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
      
      // Verify the groomer belongs to the organization before deleting
      const { data: groomerData, error: groomerError } = await supabase
        .from("groomers")
        .select("*")
        .eq("id", groomerToDelete.id)
        .eq("organization_id", organization_id)
        .single();
        
      if (groomerError || !groomerData) {
        toast.error("You don't have permission to delete this groomer.");
        return;
      }
      
      const { error } = await supabase
        .from("groomers")
        .delete()
        .eq("id", groomerToDelete.id)
        .eq("organization_id", organization_id); // Add organization filter for extra security

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

  const filteredGroomers = groomers.filter((groomer) =>
    groomer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto">
      {/* Header with Add Button and Search */}
      <div className="flex sm:flex-row justify-between items-center mb-8 gap-4">

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
        <Button
          onClick={() => {
            setEditingGroomer(null);
            setFormData({
              name: "",
              phone_number: "",
              address: "",
              shop_id: "",
            });
            setDialogOpen(true);
          }}
        >
          <Plus className=" md:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add New Groomer</span>


        </Button>
      </div>

      {/* Groomers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex-grow">
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="w-full h-48 rounded-md" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
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
      )}
      {/* Responsive Form Dialog/Drawer */}
      {useMediaQuery("(min-width: 640px)") ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>

              </DialogTitle>
            </DialogHeader>
            <Card className="w-full max-w-lg mx-auto">
              <CardHeader>
                <CardTitle>{editingGroomer ? "Edit Groomer" : "Add New Groomer"}</CardTitle>
              </CardHeader>
              <CardContent>

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
                    <Label htmlFor="shop">
                      Shop <span className="text-red-500">*</span>
                    </Label>
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


              </CardContent>

            </Card>

          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">

            </DrawerHeader>
            <div className="px-4">
            <Card className="w-full max-w-lg mx-auto">
              <CardHeader>
                <CardTitle>{editingGroomer ? "Edit Groomer" : "Add New Groomer"}</CardTitle>
              </CardHeader>
              <CardContent>

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
                    <Label htmlFor="shop">
                      Shop <span className="text-red-500">*</span>
                    </Label>
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
                    <Button type="button" variant="outline" className="hidden sm:block" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="w-full md:w-auto">
                      {editingGroomer ? "Update" : "Add"} Groomer
                    </Button>
                  </div>
                </form>


              </CardContent>

            </Card>

            </div>
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )

      }
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

// src/components/Catalog/shop.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
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
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ShopForm = ({ shop, onSuccess, onCancel }) => {
  const [name, setName] = useState(shop?.name || "");
  const [directions, setDirections] = useState(shop?.directions || "");
  const [phoneNumber, setPhoneNumber] = useState(shop?.phone_number || "");
  const [badge, setBadge] = useState(shop?.badge || "");
  const [username, setUsername] = useState(shop?.username || "");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Get organization_id from user session
      const storedSession = localStorage.getItem('userSession');
      if (!storedSession) {
        toast.error("User session not found. Please log in again.");
        setSubmitting(false);
        return;
      }
      
      const parsedUser = JSON.parse(storedSession);
      const organization_id = parsedUser.organization_id;
      
      if (!organization_id) {
        toast.error("Organization information not found. Please log in again.");
        setSubmitting(false);
        return;
      }
      
      if (shop) {
        // Update existing shop (only update password if a new one is entered)
        const { error } = await supabase
          .from("shops")
          .update({
            name,
            directions,
            phone_number: phoneNumber,
            badge,
            username,
            ...(password ? { password } : {}), // update password only if provided
          })
          .eq("id", shop.id)
          .eq("organization_id", organization_id); // Ensure shop belongs to organization
          
        if (error) throw error;
        toast.success("Shop updated successfully!");
      } else {
        // Insert new shop
        const { error } = await supabase
          .from("shops")
          .insert({
            name,
            directions,
            phone_number: phoneNumber,
            badge,
            username,
            password,
            organization_id, // Add organization_id to new shops
          });
        if (error) throw error;
        toast.success("Shop added successfully!");
      }
      onSuccess();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{shop? "Edit Shop" : "Add New Shop"}</CardTitle>
      </CardHeader>
      <CardContent>

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="shop-name">Shop Name</Label>
        <Input id="shop-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="shop-directions">Directions</Label>
        <Input id="shop-directions" value={directions} onChange={(e) => setDirections(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="shop-phone">Phone Number</Label>
        <Input id="shop-phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="shop-badge">Badge</Label>
        <Input
          id="shop-badge"
          value={badge}
          onChange={(e) => setBadge(e.target.value)}
          placeholder="e.g. Full Services Available"
        />
      </div>
      <div className="hidden">
        <Label htmlFor="shop-username">Username</Label>
        <Input id="shop-username" value={username} onChange={(e) => setUsername(e.target.value)}  />
      </div>
      <div className="hidden">
        <Label htmlFor="shop-password">
          {shop ? "New Password (leave blank to keep current)" : "Password"}
        </Label>
        <Input
          id="shop-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}

        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} className="hidden sm:block">
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}  className="w-full md:w-auto">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : shop ? "Update Shop" : "Add Shop"}
        </Button>
      </div>
    </form>
    </CardContent>

</Card>



  );
};

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export default function Shop() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shopToDelete, setShopToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch shops from Supabase
  const fetchShops = async () => {
    setLoading(true);
    
    // Get organization_id from user session
    const storedSession = localStorage.getItem('userSession');
    if (!storedSession) {
      toast.error("User session not found. Please log in again.");
      setLoading(false);
      return;
    }
    
    const parsedUser = JSON.parse(storedSession);
    const organization_id = parsedUser.organization_id;
    
    if (!organization_id) {
      toast.error("Organization information not found. Please log in again.");
      setLoading(false);
      return;
    }
    
    const { data, error } = await supabase
      .from("shops")
      .select("*")
      .eq("organization_id", organization_id) // Filter by organization_id
      .order("created_at", { ascending: false });
      
    if (error) {
      toast.error(`Error fetching shops: ${error.message}`);
    } else {
      setShops(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingShop(null);
    fetchShops();
  };

  const handleEdit = (shop) => {
    setEditingShop(shop);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingShop(null);
    setDialogOpen(true);
  };

  const handleDelete = (shop) => {
    setShopToDelete(shop);
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
      
      const parsedUser = JSON.parse(storedSession);
      const organization_id = parsedUser.organization_id;
      
      if (!organization_id) {
        toast.error("Organization information not found. Please log in again.");
        return;
      }
      
      // Verify the shop belongs to the organization before deleting
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .select("*")
        .eq("id", shopToDelete.id)
        .eq("organization_id", organization_id)
        .single();
        
      if (shopError || !shopData) {
        toast.error("You don't have permission to delete this shop.");
        return;
      }
      
      const { error } = await supabase
        .from("shops")
        .delete()
        .eq("id", shopToDelete.id)
        .eq("organization_id", organization_id); // Add organization filter for extra security
        
      if (error) throw error;
      toast.success("Shop deleted successfully!");
      fetchShops();
    } catch (error) {
      toast.error(`Error deleting shop: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setShopToDelete(null);
    }
  };

  const filteredShops = shops.filter((shop) =>
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shop.directions && shop.directions.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto">
      <div className="flex  sm:flex-row justify-between items-center mb-8 gap-4">
      
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search shops..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Button onClick={handleAddNew}>
        <Plus className=" md:mr-2 h-4 w-4" />
        <span className="hidden sm:inline"> Add New Shop</span>
         
        </Button>
      </div>
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
      ) : filteredShops.length === 0 ? (
        <p className="text-center text-gray-500">No shops found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.map((shop) => (
            <Card key={shop.id} className="group">
              <CardHeader className="pt-6 pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900">{shop.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-2">
                  {isValidUrl(shop.directions) ? (
                    <a
                      href={shop.directions}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Directions
                    </a>
                  ) : (
                    <p className="text-gray-600 flex-grow">{shop.directions}</p>
                  )}
                </div>
                <p className="text-gray-700 font-medium flex items-center">
                  <span className="mr-2">📞</span>
                  {shop.phone_number}
                </p>
                {shop.badge && (
                  <p className="mt-2 inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1.5 rounded-full font-medium transform transition-transform duration-300 ease-in-out ">
                    {shop.badge}
                  </p>
                )}
                <p className="text-gray-500 text-sm mt-2 hidden">Username: {shop.username}</p>
              </CardContent>
              <CardFooter className="flex justify-between pt-4 border-t border-gray-100">
                <Button size="sm" variant="outline" onClick={() => handleEdit(shop)} className="hover:bg-gray-50 transition-colors duration-200">
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(shop)} className="hover:bg-red-600 transition-colors duration-200">
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
             
            </DialogHeader>
            <ShopForm
              shop={editingShop}
              onSuccess={handleFormSuccess}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">
    
            </DrawerHeader>
            <div className="px-4">
              <ShopForm
                shop={editingShop}
                onSuccess={handleFormSuccess}
                onCancel={() => setDialogOpen(false)}
              />
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
      )}

      {/* Alert Dialog for Deletion Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the shop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

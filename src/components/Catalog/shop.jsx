// src/components/Catalog/shop.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
          .eq("id", shop.id);
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
        <Input id="shop-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
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
          required={!shop}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : shop ? "Update Shop" : "Add Shop"}
        </Button>
      </div>
    </form>
  );
};

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
    const { data, error } = await supabase
      .from("shops")
      .select("*")
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
      const { error } = await supabase.from("shops").delete().eq("id", shopToDelete.id);
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
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Add New Shop
        </Button>
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
            <Card key={shop.id}>
              <CardHeader className="pt-6">
                <CardTitle className="text-xl font-semibold">{shop.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{shop.directions}</p>
                <p className="text-gray-600">Phone: {shop.phone_number}</p>
                {shop.badge && (
                  <p className="mt-2 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {shop.badge}
                  </p>
                )}
                <p className="text-gray-500 text-sm mt-2 hidden">Username: {shop.username}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button size="sm" variant="outline" onClick={() => handleEdit(shop)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(shop)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for Adding/Editing Shop */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingShop ? "Edit Shop" : "Add Shop"}</DialogTitle>
          </DialogHeader>
          <ShopForm
            shop={editingShop}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

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

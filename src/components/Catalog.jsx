// src/components/Catalog.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Shop from "./Catalog/shop";
import ServiceForm from "./Catalog/ServiceForm";
import ManageTimeSlotsPage from "./Home/ManageTimeSlotsPage";
import Groomer from "./Catalog/Groomer";
import Staff from "./Catalog/Staff";
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
  AlertDialogFooter 
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Catalog() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch services from Supabase
  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Error fetching services: ${error.message}`);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Handle successful form submission
  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingService(null);
    fetchServices();
  };

  // Open dialog for editing a service
  const handleEdit = (service) => {
    setEditingService(service);
    setDialogOpen(true);
  };

  // Open dialog for adding a new service
  const handleAddNew = () => {
    setEditingService(null);
    setDialogOpen(true);
  };

  // Open delete confirmation dialog
  const handleDelete = (service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  // Confirm and execute deletion
  const confirmDelete = async () => {
    try {
      if (serviceToDelete.image_url) {
        // Extract the file name from the image URL
        const imagePath = serviceToDelete.image_url.split("/").pop();
        const { error: storageError } = await supabase
          .storage
          .from("service-images")
          .remove([imagePath]);

        if (storageError) throw storageError;
      }

      // Delete the service record from the database
      const { error: dbError } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceToDelete.id);

      if (dbError) throw dbError;

      toast.success("Service deleted successfully!");
      fetchServices();
    } catch (error) {
      toast.error(`Error deleting service: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  // Filter services based on search term
  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto">
      <Tabs defaultValue="services" className="w-full">
        <TabsList className="flex w-full mb-8 overflow-x-auto pl-10 sm:pl-1 scrollbar-hide sm:grid sm:grid-cols-5">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="timeslots">Time Slots</TabsTrigger>
          <TabsTrigger value="groomers">Groomers</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <div className="flex  sm:flex-row justify-between items-center mb-8 gap-4">
         
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Button onClick={handleAddNew}>
              <Plus className=" md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add New Service</span>
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
          ) : filteredServices.length === 0 ? (
            <p className="text-center text-gray-500">No services found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service) => (
                <Card key={service.id}>
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <p className="text-2xl font-bold text-primary">₹{service.price}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(service)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(service)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shop">
        <Shop />
        </TabsContent>

        <TabsContent value="timeslots">
          <ManageTimeSlotsPage />
        </TabsContent>

        <TabsContent value="groomers">
          <Groomer />
        </TabsContent>

        <TabsContent value="staff">
          <Staff />
        </TabsContent>
     
      </Tabs>

      {/* Responsive Dialog/Drawer for Adding or Editing Service */}
      {useMediaQuery("(min-width: 768px)") ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              
            </DialogHeader>
            <ServiceForm
              service={editingService}
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
              <ServiceForm
                service={editingService}
                onSuccess={handleFormSuccess}
                onCancel={() => setDialogOpen(false)}
              />
            </div>
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
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
              This action cannot be undone. This will permanently delete the service
              and its associated image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

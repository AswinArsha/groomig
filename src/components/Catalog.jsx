import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ServiceForm from "./Catalog/ServiceForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <div className="container mx-auto ">
     

      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Add New Service
        </Button>
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
      </div>

      {/* Dialog for Adding or Editing Service */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
           
          </DialogHeader>
          <ServiceForm
            service={editingService}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card key={service.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">{service.name}</CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="font-semibold text-lg mb-2">₹{service.price}</p>
                {service.image_url && (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-48 object-cover rounded-md"
                  />
                )}
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
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

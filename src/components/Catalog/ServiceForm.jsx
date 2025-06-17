// src/components/Catalog/ServiceForm.jsx
import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle,CardFooter  } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"
import { ImagePlus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function ServiceForm({ service, onSuccess, onCancel, loading = false }) {
  const isEditing = Boolean(service);
  
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [price, setPrice] = useState(service?.price || "");
  const [type, setType] = useState(service?.type || "checkbox"); // New state for service type
  
  const [imageUrl, setImageUrl] = useState(service?.image_url || "");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(service?.image_url || "");
  
  const imageFileRef = useRef(null);

  // Cleanup the preview URL when component unmounts or when a new file is selected
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create a preview URL for the selected file
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

      let finalImageUrl = imageUrl;

      // Handle image upload or replacement on submit
      if (selectedFile) {
        // If editing and there's an existing image, delete it first
        if (isEditing && service.image_url) {
          // Extract file path from image_url
          const imagePath = service.image_url.split("/").pop();
          const { error: removeError } = await supabase
            .storage
            .from("service-images")
            .remove([imagePath]);
          
          if (removeError) {
            toast.error(`Error deleting old image: ${removeError.message}`);
            return;
          }
        }

        // Upload new image
        const filePath = `${Date.now()}-${selectedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from("service-images")
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) {
          toast.error(`Error uploading image: ${uploadError.message}`);
          return;
        }

        // Get public URL
        const { data: { publicUrl }, error: publicUrlError } = supabase
          .storage
          .from("service-images")
          .getPublicUrl(filePath);

        if (publicUrlError) {
          toast.error(`Error getting public URL: ${publicUrlError.message}`);
          return;
        }

        finalImageUrl = publicUrl;
        setImageUrl(finalImageUrl);
      }

      const serviceData = {
        name,
        description,
        price,
        type, // Include the 'type' in the data
        image_url: finalImageUrl,
        organization_id, // Add organization_id to the service data
      };

      if (isEditing) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("services")
          .insert([serviceData]);
        if (error) throw error;
      }

      toast.success(isEditing ? "Service updated!" : "Service added!");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
<Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Service" : "Add New Service"}</CardTitle>
      </CardHeader>
      <CardContent>
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Left Column */}
    <div className="space-y-4">
      {/* Service Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Service Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter service name"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your service"
          rows={4}
        />
      </div>

      {/* Service Type */}
      <div className="space-y-2 hidden">
        <Label htmlFor="type">Service Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Select service type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checkbox">Checkbox</SelectItem>
            <SelectItem value="input">Input</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Right Column */}
    <div className="space-y-4">
      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price">Price</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          placeholder="0.00"
          min="0"
        />
      </div>

      {/* Service Image */}
      <div className="space-y-2">
        <Label htmlFor="imageFile">Service Image</Label>
        <div className="flex items-center space-x-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => document.getElementById("imageFile").click()}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <Input
            id="imageFile"
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          {previewUrl ? (
            <img
              src={previewUrl || "/placeholder.svg"}
              alt="Preview"
              className="w-20 h-20 object-cover rounded"
            />
          ) : (
            <div className="text-sm text-muted-foreground">No image selected</div>
          )}
        </div>
      </div>
    </div>
  </div>

  
</form>

      )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" className="hidden sm:block" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="w-full md:w-auto" onClick={handleSubmit}>
          {isEditing ? "Save Changes" : "Add Service"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// src/components/Catalog/ServiceForm.jsx
import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ServiceForm({ service, onSuccess, onCancel }) {
  const isEditing = Boolean(service);
  
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [price, setPrice] = useState(service?.price || "");
  
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
      let finalImageUrl = imageUrl;

      // Handle image upload or replacement on submit
      if (selectedFile) {
        // If editing and there's an existing image, delete it first
        if (isEditing && service.image_url) {
          // Extract file path from image_url
          const imagePath = service.image_url.split('/').pop();
          const { error: removeError } = await supabase
            .storage
            .from('service-images')
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
          .from('service-images')
          .upload(filePath, selectedFile, { upsert: true });

        if (uploadError) {
          toast.error(`Error uploading image: ${uploadError.message}`);
          return;
        }

        // Get public URL
        const { data: { publicUrl }, error: publicUrlError } = supabase
          .storage
          .from('service-images')
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
        image_url: finalImageUrl,
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
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Service" : "Add New Service"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="imageFile">Upload Image</Label>
            <Input
              id="imageFile"
              type="file"
              onChange={handleFileChange}
              accept="image/*"
            />
            {previewUrl && (
              <div className="mt-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded"
                />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div className="flex space-x-2">
            <Button type="submit">{isEditing ? "Save Changes" : "Add Service"}</Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// src/components/Catalog/ServiceForm.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import imageCompression from "browser-image-compression";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ImagePlus, Loader2 } from "lucide-react";

export default function ServiceForm({ service, onSuccess, onCancel, loading = false }) {
  const isEditing = Boolean(service);

  // Prevent double-submits
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [price, setPrice] = useState(service?.price || "");
  const [type, setType] = useState(service?.type || "checkbox");

  const [imageUrl, setImageUrl] = useState(service?.image_url || "");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(service?.image_url || "");
  const [compressionProgress, setCompressionProgress] = useState(0);

  // Clean up blob URLs on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle file selection and compression
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid format. Only JPEG, PNG & WEBP allowed.");
      return;
    }

    try {
      setCompressionProgress(0);

      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        onProgress: (p) => setCompressionProgress(Math.round(p)),
      };

      const compressedFile = await imageCompression(file, options);

      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }

      const objectUrl = URL.createObjectURL(compressedFile);
      setSelectedFile(compressedFile);
      setPreviewUrl(objectUrl);
      setCompressionProgress(100);
    } catch (err) {
      console.error("Compression error:", err);
      toast.error("Image compression failed.");
    }
  };

  // Handle form submission (add or edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const storedSession = localStorage.getItem("userSession");
      if (!storedSession) {
        toast.error("Session not found. Please log in.");
        return;
      }
      const { organization_id } = JSON.parse(storedSession);
      if (!organization_id) {
        toast.error("Organization info missing. Please log in.");
        return;
      }

      let finalImageUrl = imageUrl;

      // If a new image was selected, delete old then upload new
      if (selectedFile) {
        if (isEditing && service.image_url) {
          const imagePath = service.image_url.split("/").pop();
          const { error: rmErr } = await supabase
            .storage
            .from("service-images")
            .remove([imagePath]);
          if (rmErr) {
            toast.error(`Error deleting old image: ${rmErr.message}`);
            setSubmitting(false);
            return;
          }
        }

        const filePath = `${Date.now()}-${selectedFile.name}`;
        const { error: upErr } = await supabase
          .storage
          .from("service-images")
          .upload(filePath, selectedFile, { upsert: true });
        if (upErr) {
          toast.error(`Error uploading image: ${upErr.message}`);
          setSubmitting(false);
          return;
        }

        const { data: urlData, error: urlErr } = supabase
          .storage
          .from("service-images")
          .getPublicUrl(filePath);
        if (urlErr) {
          toast.error(`Error fetching image URL: ${urlErr.message}`);
          setSubmitting(false);
          return;
        }

        finalImageUrl = urlData.publicUrl;
        setImageUrl(finalImageUrl);
      }

      const payload = {
        name,
        description,
        price,
        type,
        image_url: finalImageUrl,
        organization_id,
      };

      let dbErr;
      if (isEditing) {
        ({ error: dbErr } = await supabase
          .from("services")
          .update(payload)
          .eq("id", service.id));
      } else {
        ({ error: dbErr } = await supabase
          .from("services")
          .insert([payload]));
      }
      if (dbErr) throw dbErr;

      toast.success(isEditing ? "Service updated!" : "Service added!");
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Service" : "Add New Service"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
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
              <div className="hidden">
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
              <div className="space-y-2">
                <Label htmlFor="imageFile">Service Image</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => document.getElementById("imageFile").click()}
                      disabled={submitting}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="imageFile"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={submitting}
                    />
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">No image selected</div>
                    )}
                  </div>
                  {compressionProgress > 0 && compressionProgress < 100 && (
                    <Progress value={compressionProgress} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end sm:space-x-2 space-y-2 sm:space-y-0 w-full">
  {/* Cancel button – hidden on mobile */}
  {onCancel && (
    <Button
      type="button"
      variant="outline"
      onClick={onCancel}
      disabled={submitting}
      className="hidden sm:inline-flex"
    >
      Cancel
    </Button>
  )}

  {/* Submit/Add button – full width on mobile */}
  <Button
    type="submit"
    onClick={handleSubmit}
    disabled={submitting}
    className="w-full sm:w-auto"
  >
    {submitting ? (
      <>
        <Loader2 className="animate-spin mr-2 h-4 w-4" />
        {isEditing ? "Saving…" : "Adding…"}
      </>
    ) : (
      isEditing ? "Save Changes" : "Add Service"
    )}
  </Button>
</CardFooter>

    </Card>
  );
}

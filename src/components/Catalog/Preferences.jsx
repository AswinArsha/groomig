// src/components/Catalog/Preferences.jsx
import React, { useState, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ImagePlus, Palette, Copy, ExternalLink } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function Preferences() {
  const [orgId, setOrgId] = useState(null);
  const [shopName, setShopName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [compressProgress, setCompressProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [themeColor, setThemeColor] = useState("default");
  const [customColor, setCustomColor] = useState("#e91e63");
  const [savingTheme, setSavingTheme] = useState(false);

  // ★ Track the storage path of the old image so we can delete it
  const [oldFilePath, setOldFilePath] = useState("");

  // 🆕 Track the currently applied/saved theme (what's actually in the DOM)
  const [appliedThemeColor, setAppliedThemeColor] = useState("default");
  const [appliedCustomColor, setAppliedCustomColor] = useState("#e91e63");

  // 🆕 Generate shareable booking link
  const shareableLink = orgId ? `${window.location.origin}/user/${orgId}` : "";

  // 1️⃣ Grab org ID
  useEffect(() => {
    const sess = JSON.parse(localStorage.getItem("userSession"));
    if (sess?.organization_id) setOrgId(sess.organization_id);
  }, []);

  // 2️⃣ Fetch existing prefs
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      // Fetch shop preferences
      const { data, error } = await supabase
        .from("shop_preferences")
        .select("shop_name, image_url")
        .eq("organization_id", orgId)
        .single();
      if (error) {
        console.error("Error fetching shop preferences:", error);
      } else {
        setShopName(data.shop_name || "");
        setImageUrl(data.image_url || "");
        setPreview(data.image_url || "");

        // Extract the raw file-path (everything after "/shop-layout-images/")
        if (data.image_url) {
          const marker = "/shop-layout-images/";
          const idx = data.image_url.indexOf(marker);
          if (idx !== -1) {
            const fp = data.image_url
              .slice(idx + marker.length)
              .split("?")[0];
            setOldFilePath(fp);
          }
        }
      }

      // Fetch theme preferences
      const { data: themeData, error: themeError } = await supabase
        .from("theme_preferences")
        .select("theme_color, custom_color")
        .eq("organization_id", orgId)
        .single();
      
      if (themeError && themeError.code !== "PGRST116") {
        console.error("Error fetching theme preferences:", themeError);
      } else if (themeData) {
        const fetchedThemeColor = themeData.theme_color || "default";
        const fetchedCustomColor = themeData.custom_color || "#e91e63";
        
        // Set both the form state and applied state to the saved values
        setThemeColor(fetchedThemeColor);
        setCustomColor(fetchedCustomColor);
        setAppliedThemeColor(fetchedThemeColor);
        setAppliedCustomColor(fetchedCustomColor);
        
        // Apply the saved theme to DOM
        applyThemeToDOM(fetchedThemeColor, fetchedCustomColor);
      }
    })();
  }, [orgId]);

  // 3️⃣ Handle & compress file
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressProgress(0);
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        onProgress: (p) => setCompressProgress(Math.round(p)),
      };
      const compressedFile = await imageCompression(file, options);
      setSelectedFile(compressedFile);

      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(compressedFile);
      setPreview(url);
      setCompressProgress(100);
    } catch (err) {
      console.error(err);
      toast.error("Image compression failed.");
    }
  };

  // 🆕 Copy link to clipboard
  const handleCopyLink = async () => {
    if (!shareableLink) {
      toast.error("Link not available");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareableLink);
      toast.success("Booking link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast.error("Failed to copy link");
    }
  };

  // 🆕 Open link in new tab
  const handleOpenLink = () => {
    if (!shareableLink) {
      toast.error("Link not available");
      return;
    }
    window.open(shareableLink, "_blank");
  };

  // 4️⃣ Upload, clean up old, then upsert prefs
  const handleSave = async () => {
    if (!shopName.trim()) {
      toast.error("Please enter a shop name.");
      return;
    }
    setSaving(true);

    let finalUrl = imageUrl;

    // If they've chosen a new file, delete the old one first
    if (selectedFile) {
      if (oldFilePath) {
        const { error: delErr } = await supabase
          .storage
          .from("shop-layout-images")
          .remove([oldFilePath]);
        if (delErr) {
          console.error("Error removing old image:", delErr);
          toast.error("Could not remove old image.");
        }
      }

      // Upload the new one
      const path = `${orgId}/${Date.now()}-${selectedFile.name}`;
      const { error: upErr } = await supabase
        .storage
        .from("shop-layout-images")
        .upload(path, selectedFile, { upsert: true });
      if (upErr) {
        toast.error(upErr.message);
        setSaving(false);
        return;
      }

      // Get its public URL
      const { data: urlData } = supabase
        .storage
        .from("shop-layout-images")
        .getPublicUrl(path);

      finalUrl = urlData.publicUrl;
      setImageUrl(finalUrl);
      setOldFilePath(path);
    }

    // Upsert the shop_preferences row
    const payload = {
      organization_id: orgId,
      shop_name: shopName.trim(),
      image_url: finalUrl,
      updated_at: new Date().toISOString(),
    };

    const { error: dbErr } = await supabase
      .from("shop_preferences")
      .upsert([payload], { onConflict: "organization_id" });

    if (dbErr) {
      console.error(dbErr);
      toast.error(dbErr.message);
    } else {
      toast.success("Preferences saved!");
    }
    setSaving(false);
  };

  // Convert hex color to HSL
  const hexToHsl = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  // 🆕 Centralized function to apply theme to DOM
  const applyThemeToDOM = (themeType, customColorValue) => {
    if (themeType === 'custom') {
      document.documentElement.setAttribute("data-theme", "custom");
      applyCustomTheme(customColorValue);
    } else {
      // Remove custom styles and apply predefined theme
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--chart-1');
      root.style.removeProperty('--chart-2');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-ring');
      document.documentElement.setAttribute("data-theme", themeType);
    }
  };

  // Apply custom theme
  const applyCustomTheme = (color) => {
    const [h, s, l] = hexToHsl(color);
    const root = document.documentElement;
    
    // Apply custom CSS variables
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--primary-foreground', '210 40% 98%');
    root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
    root.style.setProperty('--chart-1', `${h} ${s}% ${l}%`);
    root.style.setProperty('--chart-2', `${h} ${Math.max(s - 20, 30)}% ${Math.max(l - 10, 40)}%`);
    root.style.setProperty('--sidebar-primary', `${h} ${s}% ${Math.max(l - 10, 30)}%`);
    root.style.setProperty('--sidebar-ring', `${h} ${s}% ${Math.max(l - 15, 25)}%`);
  };

  // Save theme preferences
  const handleSaveTheme = async () => {
    if (!orgId) {
      toast.error("Organization ID not found.");
      return;
    }
    
    setSavingTheme(true);
    
    const payload = {
      organization_id: orgId,
      theme_color: themeColor,
      custom_color: themeColor === 'custom' ? customColor : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("theme_preferences")
      .upsert([payload], { onConflict: "organization_id" });

    if (error) {
      console.error("Error saving theme preferences:", error);
      toast.error("Failed to save theme preferences.");
    } else {
      toast.success("Theme preferences saved!");
      
      // 🆕 Update applied state and apply to DOM only after successful save
      setAppliedThemeColor(themeColor);
      setAppliedCustomColor(customColor);
      applyThemeToDOM(themeColor, customColor);
    }
    
    setSavingTheme(false);
  };

  // 🆕 Reset to applied theme (what's actually saved)
  const handleResetTheme = () => {
    setThemeColor(appliedThemeColor);
    setCustomColor(appliedCustomColor);
    applyThemeToDOM(appliedThemeColor, appliedCustomColor);
  };

  // 🆕 Handle theme selection - only update form state, don't apply to DOM
  const handleThemeChange = (value) => {
    setThemeColor(value);
    // Don't apply to DOM immediately - only update form state
  };

  // 🆕 Handle custom color change - only update form state, don't apply to DOM
  const handleCustomColorChange = (color) => {
    setCustomColor(color);
    // Don't apply to DOM immediately - only update form state
  };

  // 🆕 Preview theme - temporarily apply to DOM
  const handlePreviewTheme = () => {
    applyThemeToDOM(themeColor, customColor);
  };

  // 🆕 Check if current form state differs from applied state
  const hasThemeChanges = themeColor !== appliedThemeColor || 
    (themeColor === 'custom' && customColor !== appliedCustomColor);

  return (
    <div className="flex flex-col items-center p-6 sm:space-y-0 sm:p-0">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="w-full max-w-md"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="themes">Themes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4 pt-4">
          <div className="flex flex-col items-center space-y-4">
            <div>
              <label htmlFor="pref-file" className="cursor-pointer">
                <div className="
                  h-32 w-40 
                  rounded-sm 
                  border-2 border-dashed border-gray-300 
                  flex items-center justify-center
                  hover:border-gray-400 transition
                  bg-gray-50
                ">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="h-full w-full object-cover rounded-sm"
                    />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-gray-400" />
                  )}
                </div>
              </label>
              <input
                id="pref-file"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={saving}
              />
            </div>

            {compressProgress > 0 && compressProgress < 100 && (
              <Progress value={compressProgress} className="w-full" />
            )}

            <div className="w-full">
              <Label htmlFor="shop-name" className="mb-2 block">Shop Name</Label>
              <Input
                id="shop-name"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder="Enter shop display name"
                disabled={saving}
              />
            </div>

            {/* 🆕 Shareable Booking Link Section */}
            <div className="w-full">
              <Label htmlFor="booking-link" className="mb-2 block">Shareable Booking Link</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="booking-link"
                  value={shareableLink}
                  placeholder="Your booking link will appear here"
                  readOnly
                  className="flex-1 bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  disabled={!shareableLink}
                  className="shrink-0"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleOpenLink}
                  disabled={!shareableLink}
                  className="shrink-0"
                  title="Open link in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm hidden sm:block text-gray-500 mt-1">
                Share this link with customers to let them book appointments directly
              </p>
            </div>

            <div className="flex w-full">
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save General Preferences"}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="themes" className="space-y-4 pt-4">
          <div className="flex flex-col space-y-4">
            <Label className="text-base font-medium">Select Theme Color</Label>
            
            <RadioGroup 
              value={themeColor} 
              onValueChange={handleThemeChange}
              className="grid grid-cols-2 gap-4"
            >
              <Label 
                htmlFor="theme-default" 
                className="cursor-pointer"
              >
                <Card className={`overflow-hidden ${themeColor === 'default' ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="default" id="theme-default" />
                        <span>Default </span>
                      </div>
                      {themeColor === 'default' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="bg-pink-500 h-12" />
                  </CardContent>
                </Card>
              </Label>
              
              <Label 
                htmlFor="theme-blue" 
                className="cursor-pointer"
              >
                <Card className={`overflow-hidden ${themeColor === 'blue' ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="blue" id="theme-blue" />
                        <span>Blue Theme</span>
                      </div>
                      {themeColor === 'blue' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="bg-gradient-to-r from-[#0ea5e9] to-[#2563eb] h-12" />
                  </CardContent>
                </Card>
              </Label>
              
              <Label 
                htmlFor="theme-green" 
                className="cursor-pointer"
              >
                <Card className={`overflow-hidden ${themeColor === 'green' ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="green" id="theme-green" />
                        <span>Green Theme</span>
                      </div>
                      {themeColor === 'green' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="bg-gradient-to-r from-[#10b981] to-[#059669] h-12" />
                  </CardContent>
                </Card>
              </Label>
              
              <Label 
                htmlFor="theme-custom" 
                className="cursor-pointer"
              >
                <Card className={`overflow-hidden ${themeColor === 'custom' ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="theme-custom" />
                        <div>Custom</div>
                        <Palette className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {themeColor === 'custom' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div 
                      className="h-12" 
                      style={{ 
                        background: `linear-gradient(to right, ${customColor}, ${customColor}dd)` 
                      }}
                    />
                  </CardContent>
                </Card>
              </Label>
            </RadioGroup>
            
            {themeColor === 'custom' && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="custom-color">Custom Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    id="custom-color"
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="h-10 w-16 rounded border border-input bg-background cursor-pointer"
                  />
                  <Input
                    value={customColor}
                    onChange={(e) => {
                      if (e.target.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                        handleCustomColorChange(e.target.value);
                      }
                    }}
                    placeholder="#e91e63"
                    className="flex-1"
                  />
                </div>
              </div>
            )}
            
            {/* 🆕 Show preview and reset buttons only when there are unsaved changes */}
            {hasThemeChanges && (
              <div className="flex w-full gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePreviewTheme}
                  disabled={savingTheme}
                >
                  Preview
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleResetTheme}
                  disabled={savingTheme}
                >
                  Reset
                </Button>
              </div>
            )}
            
            <div className="flex w-full pt-4">
              <Button
                className="flex-1"
                onClick={handleSaveTheme}
                disabled={savingTheme}
              >
                {savingTheme ? "Saving…" : "Save Theme Preferences"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
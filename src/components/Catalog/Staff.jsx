// src/components/Catalog/Staff.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
 import { useMediaQuery } from "@/hooks/use-media-query";
import { Loader2, Plus, Pencil, Trash2, Search, CheckIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [password, setPassword] = useState(""); // State for password input
  const [isPasswordVisible, setIsPasswordVisible] = useState(false); // State for password visibility
  const id = React.useId(); // For unique IDs

  const togglePasswordVisibility = () => setIsPasswordVisible((prevState) => !prevState);

  // Password validation function (updated)
  const checkPasswordStrength = (pass) => {
    const requirements = [
      { regex: /.{8,}/, text: "At least 8 characters" },
      { regex: /[0-9]/, text: "At least 1 number" },
      { regex: /[a-z]/, text: "At least 1 lowercase letter" },
      { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
    ];

    return requirements.map((req) => ({
      met: req.regex.test(pass),
      text: req.text,
    }));
  };

  const passwordStrength = React.useMemo(() => checkPasswordStrength(password), [password]);
  const passwordStrengthScore = React.useMemo(() => passwordStrength.filter((req) => req.met).length, [passwordStrength]);

  const getStrengthColor = (score) => {
    if (score === 0) return "bg-border";
    if (score <= 1) return "bg-red-500";
    if (score <= 2) return "bg-orange-500";
    if (score === 3) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getStrengthText = (score) => {
    if (score === 0) return "Enter a password";
    if (score <= 2) return "Weak password";
    if (score === 3) return "Medium password";
    return "Strong password";
  };

  // Fetch staff from Supabase
  const fetchStaff = async () => {
    setLoading(true);
    
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
    
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq('role', 'staff')
      .eq('organization_id', organization_id) // Filter by organization_id
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`Error fetching staff: ${error.message}`);
    } else {
      setStaff(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
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
    
    const staffData = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      username: formData.get("username"),
      password: password, // Use state variable for password
      role: 'staff', // Set default role as staff
      organization_id, // Add organization_id to staff data
    };

    // Validate password strength
    if (staffData.password && passwordStrengthScore < 4) {
      toast.error(
        "Password must meet all requirements: at least 8 characters, uppercase, lowercase, and number."
      );
      return;
    }

    try {
      if (editingStaff) {
        const { error } = await supabase
          .from("staff")
          .update(staffData)
          .eq("id", editingStaff.id);
        if (error) throw error;
        toast.success("Staff updated successfully!");
      } else {
        const { error } = await supabase.from("staff").insert([staffData]);
        if (error) throw error;
        toast.success("Staff added successfully!");
      }
      setDialogOpen(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handle staff deletion
  const handleDelete = async () => {
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
      
      // Verify the staff belongs to the organization before deleting
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("id", staffToDelete.id)
        .eq("organization_id", organization_id)
        .single();
        
      if (staffError || !staffData) {
        toast.error("You don't have permission to delete this staff member.");
        return;
      }
      
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", staffToDelete.id)
        .eq("organization_id", organization_id); // Add organization filter for extra security

      if (error) throw error;
      toast.success("Staff deleted successfully!");
      fetchStaff();
    } catch (error) {
      toast.error(`Error deleting staff: ${error.message}`);
    } finally {
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    }
  };

  const handleOpenDialog = (staff = null) => {
    setEditingStaff(staff);
    setPassword(""); // Reset password state
    setIsPasswordVisible(false); // Reset password visibility
    setDialogOpen(true);
  };

  // Filter staff based on search term
  const filteredStaff = staff.filter((member) =>
    (member.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (member.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex  sm:flex-row justify-between items-center gap-4">
  
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}> {/* Use new handler */}
        <Plus className=" md:mr-2 h-4 w-4" />
        <span className="hidden sm:inline">Add New Staff</span>
          
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
      ) : filteredStaff.length === 0 ? (
        <p className="text-center text-gray-500">No staff members found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member) => (
            <Card key={member.id}>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-gray-600">{member.phone}</p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleOpenDialog(member); // Use new handler for editing
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setStaffToDelete(member);
                    setDeleteDialogOpen(true);
                  }}
                >
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingStaff?.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="number"
                    defaultValue={editingStaff?.phone}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    defaultValue={editingStaff?.username}
                    required
                  />
                </div>
                <div className="space-y-2">
                  {/* <Label htmlFor={`${id}-password`}>Password</Label> */}
                  <div className="relative">
                    <Input
                      id={`${id}-password`}
                      name="password"
                      type={isPasswordVisible ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!editingStaff}
                      className="pe-9"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {isPasswordVisible ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-2">
                    <div
                      className="h-1 w-full rounded-full bg-border overflow-hidden"
                      role="progressbar"
                      aria-valuenow={passwordStrengthScore}
                      aria-valuemin={0}
                      aria-valuemax={4}
                    >
                      <div
                        className={`h-full ${getStrengthColor(passwordStrengthScore)} transition-all duration-500`}
                        style={{ width: `${(passwordStrengthScore / 4) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm mt-1">{getStrengthText(passwordStrengthScore)}</p>
                  </div>
                  
                  <ul className="space-y-1.5 text-sm mt-2">
                    {passwordStrength.map((req, index) => (
                      <li key={index} className="flex items-center gap-2">
                        {req.met ? (
                          <CheckIcon className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XIcon className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={req.met ? "text-emerald-500" : "text-gray-500"}>
                          {req.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingStaff ? "Update Staff" : "Add Staff"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {editingStaff ? "Edit Staff" : "Add New Staff"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 mb-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name-mobile">Name</Label>
                  <Input
                    id="name-mobile"
                    name="name"
                    defaultValue={editingStaff?.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-mobile">Phone</Label>
                  <Input
                    id="phone-mobile"
                    name="phone"
                    type="number"
                    defaultValue={editingStaff?.phone}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username-mobile">Username</Label>
                  <Input
                    id="username-mobile"
                    name="username"
                    defaultValue={editingStaff?.username}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-mobile">Password</Label>
                  <div className="relative">
                    <Input
                      id="password-mobile"
                      name="password"
                      type={isPasswordVisible ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!editingStaff}
                      className="pe-9"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      {isPasswordVisible ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  
                  <div className="mt-2">
                    <div
                      className="h-1 w-full rounded-full bg-border overflow-hidden"
                      role="progressbar"
                      aria-valuenow={passwordStrengthScore}
                      aria-valuemin={0}
                      aria-valuemax={4}
                    >
                      <div
                        className={`h-full ${getStrengthColor(passwordStrengthScore)} transition-all duration-500`}
                        style={{ width: `${(passwordStrengthScore / 4) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm mt-1">{getStrengthText(passwordStrengthScore)}</p>
                  </div>
                </div>
                
                <div className="flex flex-col justify-end gap-2 pt-2">
                 
                  <Button type="submit" className="flex-1">
                    {editingStaff ? "Update Staff" : "Add Staff"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Alert Dialog for Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the staff
              member's account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
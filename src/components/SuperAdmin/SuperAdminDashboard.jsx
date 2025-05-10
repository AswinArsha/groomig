// src/components/SuperAdmin/SuperAdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../supabase";
import toast from 'react-hot-toast';
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Loader2, LogOut, PlusCircle, Edit2, Trash2, MoreVertical, Users, Building, CheckCircle, XCircle, Eye } from 'lucide-react';

const initialOrgFormData = {
  id: null,
  name: '',
  subscription_status: 'inactive',
};

const initialUserFormData = {
  id: null,
  username: '',
  password: '', // Handle password securely, this is for UI only
  organization_id: null,
};

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Organization Modal State
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [orgFormData, setOrgFormData] = useState(initialOrgFormData);
  const [isEditModeOrg, setIsEditModeOrg] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState(null);

  // Admin User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [currentUserFormData, setCurrentUserFormData] = useState(initialUserFormData);
  const [isEditModeUser, setIsEditModeUser] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [organizationAdmins, setOrganizationAdmins] = useState([]);
  const [userToDelete, setUserToDelete] = useState(null);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      if (orgsError) throw orgsError;
      setOrganizations(orgs || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const superAdminSession = localStorage.getItem('superAdminSession');
    if (!superAdminSession) {
      navigate('/admin');
      return;
    }
    fetchData();
  }, [navigate, fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('superAdminSession');
    toast.success('Logged out successfully');
    navigate('/admin');
  };

  // Organization CRUD
  const handleOpenOrgModal = (org = null) => {
    if (org) {
      setOrgFormData({ id: org.id, name: org.name, subscription_status: org.subscription_status || 'inactive' });
      setIsEditModeOrg(true);
    } else {
      setOrgFormData(initialOrgFormData);
      setIsEditModeOrg(false);
    }
    setIsOrgModalOpen(true);
  };

  const handleSaveOrganization = async () => {
    if (!orgFormData.name) {
      toast.error('Organization name is required.');
      return;
    }
    try {
      let error;
      if (isEditModeOrg && orgFormData.id) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ name: orgFormData.name, subscription_status: orgFormData.subscription_status })
          .eq('id', orgFormData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('organizations')
          .insert([{ name: orgFormData.name, subscription_status: orgFormData.subscription_status }]);
        error = insertError;
      }

      if (error) throw error;
      toast.success(`Organization ${isEditModeOrg ? 'updated' : 'created'} successfully!`);
      setIsOrgModalOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error(`Failed to ${isEditModeOrg ? 'update' : 'create'} organization.`);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!orgToDelete) return;
    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgToDelete.id);
      if (error) throw error;
      toast.success('Organization deleted successfully!');
      setOrgToDelete(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Failed to delete organization. It might have associated users.');
    }
  };

  // Admin User CRUD for a selected organization
  const fetchAdminsForOrganization = async (organizationId) => {
    if (!organizationId) return;
    setLoadingAdmins(true);
    try {
      const { data: admins, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrganizationAdmins(admins || []);
    } catch (error) {
      console.error('Error fetching admins for organization:', error);
      toast.error('Failed to load admin users for this organization.');
      setOrganizationAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const handleOpenUserManagementModal = (org) => {
    setSelectedOrganization(org);
    fetchAdminsForOrganization(org.id);
    setIsUserModalOpen(true);
    setCurrentUserFormData({...initialUserFormData, organization_id: org.id });
    setIsEditModeUser(false);
  };

  const handleOpenAdminUserModal = (user = null) => {
    if (user) {
      setCurrentUserFormData({ id: user.id, username: user.username, password: '', organization_id: selectedOrganization.id });
      setIsEditModeUser(true);
    } else {
      setCurrentUserFormData({...initialUserFormData, organization_id: selectedOrganization.id });
      setIsEditModeUser(false);
    }
    // This function now just prepares form, modal is already open or will be opened by another trigger
  };

  const handleSaveAdminUser = async () => {
    if (!currentUserFormData.username) {
      toast.error('Username is required.');
      return;
    }
    if (!isEditModeUser && !currentUserFormData.password) {
        toast.error('Password is required for new users.');
        return;
    }

    try {
      let error;
      const userData = {
        username: currentUserFormData.username,
        organization_id: selectedOrganization.id,
      };
      // Only include password if it's a new user or password is being changed
      if (currentUserFormData.password) {
        // In a real app, password should be hashed securely before sending to backend
        // or handled by Supabase Auth. For this example, we assume a 'password' field exists
        // and Supabase handles hashing or you have a trigger for it.
        // If your 'admin_users' table expects 'password_hash', you'd hash here or via an edge function.
        userData.password = currentUserFormData.password; // Simplification
      }

      if (isEditModeUser && currentUserFormData.id) {
        const { error: updateError } = await supabase
          .from('admin_users')
          .update(userData)
          .eq('id', currentUserFormData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('admin_users')
          .insert([userData]);
        error = insertError;
      }

      if (error) throw error;
      toast.success(`Admin user ${isEditModeUser ? 'updated' : 'created'} successfully!`);
      fetchAdminsForOrganization(selectedOrganization.id); // Refresh admin list
      setCurrentUserFormData({...initialUserFormData, organization_id: selectedOrganization.id }); // Reset form
      setIsEditModeUser(false);
      // Potentially close a sub-modal if one was used for add/edit user form
    } catch (error) {
      console.error('Error saving admin user:', error);
      toast.error(`Failed to ${isEditModeUser ? 'update' : 'create'} admin user.`);
    }
  };

  const handleDeleteAdminUser = async () => {
    if (!userToDelete || !selectedOrganization) return;
    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', userToDelete.id);
      if (error) throw error;
      toast.success('Admin user deleted successfully!');
      setUserToDelete(null);
      fetchAdminsForOrganization(selectedOrganization.id); // Refresh admin list
    } catch (error) {
      console.error('Error deleting admin user:', error);
      toast.error('Failed to delete admin user.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 md:py-8 px-2 md:px-4 min-h-screen bg-gray-50">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage organizations and their administrators.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </header>

      {/* Organizations Management */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-blue-600" />Organizations</CardTitle>
            <CardDescription>View, add, edit, or delete organizations.</CardDescription>
          </div>
          <Button onClick={() => handleOpenOrgModal()}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Organization
          </Button>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No organizations found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map(org => (
                    <motion.tr 
                      key={org.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${org.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {org.subscription_status || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenUserManagementModal(org)}>
                              <Eye className="mr-2 h-4 w-4" /> Manage Admins
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenOrgModal(org)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => setOrgToDelete(org)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization Create/Edit Modal */}
      <Dialog open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditModeOrg ? 'Edit Organization' : 'Add New Organization'}</DialogTitle>
            <DialogDescription>
              {isEditModeOrg ? 'Update the details of the organization.' : 'Enter the details for the new organization.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="org-name" className="text-right">
                Name
              </Label>
              <Input 
                id="org-name" 
                value={orgFormData.name} 
                onChange={(e) => setOrgFormData({...orgFormData, name: e.target.value})} 
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="org-status" className="text-right">
                Status
              </Label>
              <select 
                id="org-status" 
                value={orgFormData.subscription_status} 
                onChange={(e) => setOrgFormData({...orgFormData, subscription_status: e.target.value})} 
                className="col-span-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="trial">Trial</option>
                {/* Add other statuses as needed */}
              </select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveOrganization}>{isEditModeOrg ? 'Save Changes' : 'Create Organization'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Organization Delete Confirmation */}
      <AlertDialog open={!!orgToDelete} onOpenChange={() => setOrgToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization
              <strong>{orgToDelete?.name}</strong> and potentially its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrgToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrganization} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin User Management Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Manage Admin Users for: {selectedOrganization?.name}</DialogTitle>
            <DialogDescription>Add, edit, or delete admin users for this organization.</DialogDescription>
          </DialogHeader>
          
          {/* Form to Add/Edit Admin User (can be part of this modal or a sub-modal/section) */}
          <Card className="my-4">
            <CardHeader>
              <CardTitle className="text-lg">{isEditModeUser ? 'Edit Admin User' : 'Add New Admin User'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="user-username">Username</Label>
                <Input 
                  id="user-username" 
                  value={currentUserFormData.username} 
                  onChange={(e) => setCurrentUserFormData({...currentUserFormData, username: e.target.value})} 
                />
              </div>
              <div>
                <Label htmlFor="user-password">Password {isEditModeUser && "(leave blank to keep current)"}</Label>
                <Input 
                  id="user-password" 
                  type="password" 
                  value={currentUserFormData.password} 
                  onChange={(e) => setCurrentUserFormData({...currentUserFormData, password: e.target.value})} 
                />
              </div>
              <div className="flex justify-end gap-2">
                {isEditModeUser && (
                  <Button variant="outline" onClick={() => { setIsEditModeUser(false); setCurrentUserFormData({...initialUserFormData, organization_id: selectedOrganization.id }); }}>
                    Cancel Edit
                  </Button>
                )}
                <Button onClick={handleSaveAdminUser}>
                  {isEditModeUser ? 'Save Changes' : 'Add User'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* List of Admin Users for the Organization */}
          <h3 className="text-md font-semibold mb-2 mt-6">Existing Admin Users</h3>
          {loadingAdmins ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : organizationAdmins.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No admin users found for this organization.</p>
          ) : (
            <div className="overflow-x-auto max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizationAdmins.map(admin => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.username}</TableCell>
                      <TableCell>{new Date(admin.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenAdminUserModal(admin)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => setUserToDelete(admin)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter className="mt-6">
            <DialogClose asChild>
                <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin User Delete Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the admin user 
              <strong>{userToDelete?.username}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAdminUser} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
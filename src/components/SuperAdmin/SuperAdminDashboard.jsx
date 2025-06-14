// src/components/SuperAdmin/SuperAdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "../../supabase";
import toast from 'react-hot-toast';
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { Loader2, LogOut, PlusCircle, Edit2, Trash2, MoreVertical, Users, Building, CheckCircle, XCircle, Eye, CreditCard, EyeIcon, EyeOffIcon, CheckIcon, XIcon } from 'lucide-react';

const initialSubscriptionFormData = {
  id: null,
  name: '',
  duration_months: 1,
  price: 0,
  description: '',
  features: [],
  is_active: true
};

const initialOrgFormData = {
  id: null,
  name: '',
  subscription_status: 'inactive',
  subscription_plan_id: null,
  subscription_end_date: null,
};

const initialUserFormData = {
  id: null,
  username: '',
  password: '', // Handle password securely, this is for UI only
  organization_id: null,
};

export default function SuperAdminDashboard() {
  // Subscription State
  const [subscriptions, setSubscriptions] = useState([]);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionFormData, setSubscriptionFormData] = useState(initialSubscriptionFormData);
  const [isEditModeSubscription, setIsEditModeSubscription] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionSearchQuery, setSubscriptionSearchQuery] = useState('');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Filter organizations based on search query
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter subscriptions based on search query
  const filteredSubscriptions = subscriptions.filter(plan =>
    plan.name.toLowerCase().includes(subscriptionSearchQuery.toLowerCase())
  );
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
  
  // Subscription History State
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('admins');

  // Password validation states
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const id = React.useId();

  const togglePasswordVisibility = () => setIsPasswordVisible((prevState) => !prevState);

  // Password validation function
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

  const passwordStrength = React.useMemo(() => checkPasswordStrength(currentUserFormData.password), [currentUserFormData.password]);
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

  const fetchSubscriptions = useCallback(async () => {
    setLoadingSubscriptions(true);
    try {
      const { data: subs, error: subsError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('created_at', { ascending: false });
      if (subsError) throw subsError;
      setSubscriptions(subs || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscription plans.');
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

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

  const handleOpenSubscriptionModal = (subscription = null) => {
    if (subscription) {
      setSubscriptionFormData({
        id: subscription.id,
        name: subscription.name,
        duration_months: subscription.duration_months,
        price: subscription.price,
        description: subscription.description || '',
        features: subscription.features || [],
        is_active: subscription.is_active
      });
      setIsEditModeSubscription(true);
    } else {
      setSubscriptionFormData(initialSubscriptionFormData);
      setIsEditModeSubscription(false);
    }
    setIsSubscriptionModalOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!subscriptionFormData.name || subscriptionFormData.duration_months < 1 || subscriptionFormData.price < 0) {
      toast.error('Please fill all required fields with valid values.');
      return;
    }
    try {
      let error;
      if (isEditModeSubscription && subscriptionFormData.id) {
        const { error: updateError } = await supabase
          .from('subscription_plans')
          .update({
            name: subscriptionFormData.name,
            duration_months: subscriptionFormData.duration_months,
            price: subscriptionFormData.price,
            description: subscriptionFormData.description,
            features: subscriptionFormData.features,
            is_active: subscriptionFormData.is_active
          })
          .eq('id', subscriptionFormData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('subscription_plans')
          .insert([{
            name: subscriptionFormData.name,
            duration_months: subscriptionFormData.duration_months,
            price: subscriptionFormData.price,
            description: subscriptionFormData.description,
            features: subscriptionFormData.features,
            is_active: subscriptionFormData.is_active
          }]);
        error = insertError;
      }

      if (error) throw error;
      toast.success(`Subscription plan ${isEditModeSubscription ? 'updated' : 'created'} successfully!`);
      setIsSubscriptionModalOpen(false);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error saving subscription plan:', error);
      toast.error(`Failed to ${isEditModeSubscription ? 'update' : 'create'} subscription plan.`);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!subscriptionToDelete) return;
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', subscriptionToDelete.id);
      if (error) throw error;
      toast.success('Subscription plan deleted successfully!');
      setSubscriptionToDelete(null);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      toast.error('Failed to delete subscription plan.');
    }
  };

  useEffect(() => {
    const superAdminSession = localStorage.getItem('superAdminSession');
    if (!superAdminSession) {
      navigate('/admin');
      return;
    }
    fetchData();
    fetchSubscriptions();
  }, [navigate, fetchData]);

  const handleLogout = () => {
    localStorage.removeItem('superAdminSession');
    toast.success('Logged out successfully');
    navigate('/admin');
  };

  // Organization CRUD
  const handleOpenOrgModal = (org = null) => {
    if (org) {
      setOrgFormData({ 
        id: org.id, 
        name: org.name, 
        subscription_status: org.subscription_status || 'inactive',
        subscription_plan_id: org.subscription_plan_id || null,
        subscription_end_date: org.subscription_end_date || null
      });
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
      // Calculate subscription end date if a plan is selected
      let subscriptionEndDate = null;
      if (orgFormData.subscription_plan_id && orgFormData.subscription_status === 'active') {
        // Find the selected plan
        const selectedPlan = subscriptions.find(plan => plan.id === orgFormData.subscription_plan_id);
        if (selectedPlan) {
          // Calculate end date based on plan duration
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + selectedPlan.duration_months);
          subscriptionEndDate = endDate.toISOString();
        }
      }
      
      let error;
      if (isEditModeOrg && orgFormData.id) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ 
            name: orgFormData.name, 
            subscription_status: orgFormData.subscription_status,
            subscription_plan_id: orgFormData.subscription_plan_id,
            subscription_end_date: subscriptionEndDate
          })
          .eq('id', orgFormData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('organizations')
          .insert([{ 
            name: orgFormData.name, 
            subscription_status: orgFormData.subscription_status,
            subscription_plan_id: orgFormData.subscription_plan_id,
            subscription_end_date: subscriptionEndDate
          }]);
        error = insertError;
      }

      if (error) throw error;
      toast.success(`Organization ${isEditModeOrg ? 'updated' : 'created'} successfully!`);
      setIsOrgModalOpen(false);
      fetchData();
      fetchSubscriptions(); // Refresh data
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error(`Failed to ${isEditModeOrg ? 'update' : 'create'} organization.`);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!orgToDelete) return;
    try {
      // First delete associated staff records
      const { error: staffError } = await supabase
        .from('staff')
        .delete()
        .eq('organization_id', orgToDelete.id);
      
      if (staffError) throw staffError;

      // Then delete the organization
      const { error: orgError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgToDelete.id);

      if (orgError) throw orgError;

      toast.success('Organization and associated staff deleted successfully!');
      setOrgToDelete(null);
      fetchData();
      fetchSubscriptions(); // Refresh data
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Failed to delete organization and its associated data.');
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

  // Fetch subscription history for an organization
  const fetchSubscriptionHistory = async (organizationId) => {
    if (!organizationId) return;
    setLoadingHistory(true);
    try {
      const { data: history, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSubscriptionHistory(history || []);
    } catch (error) {
      console.error('Error fetching subscription history:', error);
      toast.error('Failed to load subscription history for this organization.');
      setSubscriptionHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenUserManagementModal = (org) => {
    setSelectedOrganization(org);
    setActiveTab('admins'); // Reset to admins tab by default
    fetchAdminsForOrganization(org.id);
    fetchSubscriptionHistory(org.id);
    setIsUserModalOpen(true);
    setCurrentUserFormData({...initialUserFormData, organization_id: org.id });
    setIsEditModeUser(false);
    setIsPasswordVisible(false); // Reset password visibility
  };

  const handleOpenAdminUserModal = (user = null) => {
    if (user) {
      setCurrentUserFormData({ id: user.id, username: user.username, password: '', organization_id: selectedOrganization.id });
      setIsEditModeUser(true);
    } else {
      setCurrentUserFormData({...initialUserFormData, organization_id: selectedOrganization.id });
      setIsEditModeUser(false);
    }
    setIsPasswordVisible(false); // Reset password visibility
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

    // Validate password strength if password is provided
    if (currentUserFormData.password && passwordStrengthScore < 4) {
      if (isMobile) {
        toast.error(
          "Password must meet all requirements: at least 8 characters, uppercase, lowercase, and number."
        );
        return;
      } else {
        toast.error(
          "Password must meet all requirements: at least 8 characters, uppercase, lowercase, and number."
        );
        return;
      }
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
      setIsPasswordVisible(false); // Reset password visibility
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
      <div className="mx-auto my-auto">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-4 mt-4">
      <header className="flex justify-between items-start md:items-center mb-6 md:mb-8 gap-4 ">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1 hidden md:block">Manage organizations and their administrators.</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 " />
          <span className='hidden md:block'>Logout</span>
        </Button>
      </header>

      <Tabs defaultValue="organizations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="organizations"> Organizations</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscription Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          {/* Subscription Plans Management */}
          <Card>
        <CardHeader className="flex flex-col md:flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600 md:block hidden" /><span className="md:inline hidden">Subscription Plans</span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search plans..."
              value={subscriptionSearchQuery}
              onChange={(e) => setSubscriptionSearchQuery(e.target.value)}
              className="w-[200px]"
            />
            <Button onClick={() => handleOpenSubscriptionModal()}>
              <PlusCircle className="h-4 w-4" /> <span className='hidden md:block'>Add Plan</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No subscription plans found.</p>
          ) : isMobile ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredSubscriptions.map(plan => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-lg">{plan.name}</h3>
                      <p className="text-sm text-gray-600">{plan.duration_months} months</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenSubscriptionModal(plan)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => setSubscriptionToDelete(plan)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">₹{plan.price}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-300 bg-gray-50 rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead >Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map(plan => (
                    <motion.tr
                      key={plan.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{plan.duration_months} months</TableCell>
                      <TableCell>₹{plan.price}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenSubscriptionModal(plan)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => setSubscriptionToDelete(plan)}>
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
        </TabsContent>

         <TabsContent value="organizations">
           {/* Organizations Management */}
           <Card>
        <CardHeader className="flex flex-col md:flex-row items-center justify-between ">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600 md:block hidden" /><span className="md:inline hidden">Organizations</span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px]"
            />
            <Button onClick={() => handleOpenOrgModal()}>
              <PlusCircle className="h-4 w-4" /> <span className='hidden md:block'>Add Organization</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrganizations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No organizations found.</p>
          ) : isMobile ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredOrganizations.map(org => (
                <motion.div
                  key={org.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-lg shadow p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-lg">{org.name}</h3>
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
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${org.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {org.subscription_status || 'N/A'}
                      </span>
                    </div>
                    {org.subscription_plan_id && (
                      <div className="text-sm">
                        <span className="font-medium">
                          {subscriptions.find(plan => plan.id === org.subscription_plan_id)?.name || 'Unknown Plan'}
                        </span>
                        {org.subscription_end_date && (
                          <div className="text-xs text-gray-500">
                            Expires: {new Date(org.subscription_end_date).toLocaleDateString('en-GB')}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      Created: {new Date(org.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-300 bg-gray-50 rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
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
                      <TableCell>
                        {org.subscription_plan_id ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {subscriptions.find(plan => plan.id === org.subscription_plan_id)?.name || 'Unknown Plan'}
                            </span>
                            {org.subscription_end_date && (
                              <span className="text-xs text-gray-500">
                                Expires: {new Date(org.subscription_end_date).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">No plan</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(org.created_at).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell className="text-right">
  <div className="flex items-center justify-end gap-2">
    <Button 
      variant="outline" 
     
      className="h-7 px-2 text-xs hover:bg-gray-100"
      onClick={() => handleOpenUserManagementModal(org)}
    >
      <Eye className="h-3 w-3 " />
      Manage Admins
    </Button>
    <Button 
      variant="outline" 
      size="sm"jn 
      className="h-7 px-2 text-xs hover:bg-gray-100"
      onClick={() => handleOpenOrgModal(org)}
    >
      <Edit2 className="h-3 w-3 " />
      Edit
    </Button>
    <Button 
      variant="ghost" 
      size="sm"
      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
      onClick={() => setOrgToDelete(org)}
    >
      <Trash2 className="h-3 w-3 " />
      Delete
    </Button>
  </div>
</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
          </Card>
         </TabsContent>
       </Tabs>

       {/* Organization Create/Edit Modal - Responsive */}
      {isMobile ? (
        <Drawer open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{isEditModeOrg ? 'Edit Organization' : 'Add New Organization'}</DrawerTitle>
              <DrawerDescription>
                {isEditModeOrg ? 'Update the details of the organization.' : 'Enter the details for the new organization.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="org-name">Name</Label>
                  <Input 
                    id="org-name" 
                    value={orgFormData.name} 
                    onChange={(e) => setOrgFormData({...orgFormData, name: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="org-status">Status</Label>
                  <Select
                    value={orgFormData.subscription_status}
                    onValueChange={(value) => setOrgFormData({...orgFormData, subscription_status: value})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                       </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="org-subscription-plan">Subscription Plan</Label>
                  <Select
                    value={orgFormData.subscription_plan_id || "none"}
                    onValueChange={(value) => setOrgFormData({...orgFormData, subscription_plan_id: value === "none" ? null : value})}
                    disabled={orgFormData.subscription_status !== 'active'}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a subscription plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subscriptions.filter(plan => plan.is_active).map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {plan.duration_months} months (₹{plan.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {orgFormData.subscription_status !== 'active' && (
                    <p className="text-sm text-muted-foreground mt-1">Enable active status to select a plan</p>
                  )}
                </div>
              </div>
            </div>
            <DrawerFooter className="pt-2">
              <Button onClick={handleSaveOrganization}>{isEditModeOrg ? 'Save Changes' : 'Create Organization'}</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOrgModalOpen} onOpenChange={setIsOrgModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{isEditModeOrg ? 'Edit Organization' : 'Add New Organization'}</DialogTitle>
              <DialogDescription>
                {isEditModeOrg ? 'Update the details of the organization.' : 'Enter the details for the new organization.'}
              </DialogDescription>
            </DialogHeader>
            <div className=" gap-4 py-4 space-y-4">
              <div className=" items-center gap-4">
                <Label htmlFor="org-name" className="text-right">Name</Label>
                <Input 
                  id="org-name" 
                  value={orgFormData.name} 
                  onChange={(e) => setOrgFormData({...orgFormData, name: e.target.value})} 
                  className="col-span-3" 
                />
              </div>
              <div className="items-center gap-4">
                <Label htmlFor="org-status" className="text-right">Status</Label>
                <Select
                  value={orgFormData.subscription_status}
                  onValueChange={(value) => setOrgFormData({...orgFormData, subscription_status: value})}
                  className="w-full"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="items-center gap-4">
                <Label htmlFor="org-subscription-plan" className="text-right">Subscription Plan</Label>
                <Select
                  value={orgFormData.subscription_plan_id || "none"}
                  onValueChange={(value) => setOrgFormData({...orgFormData, subscription_plan_id: value === "none" ? null : value})}
                  className="w-full"
                  disabled={orgFormData.subscription_status !== 'active'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subscription plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subscriptions.filter(plan => plan.is_active).map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {plan.duration_months} months (₹{plan.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {orgFormData.subscription_status !== 'active' && (
                  <p className="text-sm text-muted-foreground mt-1">Enable active status to select a plan</p>
                )}
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
      )}

      {/* Subscription Modal - Responsive */}
      {isMobile ? (
        <Drawer open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{isEditModeSubscription ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}</DrawerTitle>
              <DrawerDescription>
                {isEditModeSubscription ? 'Update the subscription plan details.' : 'Enter the details for the new subscription plan.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="plan-name">Name</Label>
                  <Input
                    id="plan-name"
                    value={subscriptionFormData.name}
                    onChange={(e) => setSubscriptionFormData({...subscriptionFormData, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan-duration">Duration (months)</Label>
                  <Input
                    id="plan-duration"
                    type="number"
                    min="1"
                    value={subscriptionFormData.duration_months}
                    onChange={(e) => setSubscriptionFormData({...subscriptionFormData, duration_months: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan-price">Price (₹)</Label>
                  <Input
                    id="plan-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={subscriptionFormData.price}
                    onChange={(e) => setSubscriptionFormData({...subscriptionFormData, price: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan-description">Description</Label>
                  <Input
                    id="plan-description"
                    value={subscriptionFormData.description}
                    onChange={(e) => setSubscriptionFormData({...subscriptionFormData, description: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan-status">Status</Label>
                  <Select
                    value={subscriptionFormData.is_active.toString()}
                    onValueChange={(value) => setSubscriptionFormData({...subscriptionFormData, is_active: value === 'true'})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DrawerFooter className="pt-2">
              <Button onClick={handleSaveSubscription}>{isEditModeSubscription ? 'Save Changes' : 'Create Plan'}</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{isEditModeSubscription ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}</DialogTitle>
              <DialogDescription>
                {isEditModeSubscription ? 'Update the subscription plan details.' : 'Enter the details for the new subscription plan.'}
              </DialogDescription>
            </DialogHeader>
            <div className="gap-4 py-4 space-y-4">
              <div className="items-center gap-4">
                <Label htmlFor="plan-name" className="text-right">Name</Label>
                <Input
                  id="plan-name"
                  value={subscriptionFormData.name}
                  onChange={(e) => setSubscriptionFormData({...subscriptionFormData, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="items-center gap-4">
                <Label htmlFor="plan-duration" className="text-right">Duration (months)</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  min="1"
                  value={subscriptionFormData.duration_months}
                  onChange={(e) => setSubscriptionFormData({...subscriptionFormData, duration_months: parseInt(e.target.value) || 1})}
                  className="col-span-3"
                />
              </div>
              <div className="items-center gap-4">
                <Label htmlFor="plan-price" className="text-right">Price (₹)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={subscriptionFormData.price}
                  onChange={(e) => setSubscriptionFormData({...subscriptionFormData, price: parseFloat(e.target.value) || 0})}
                  className="col-span-3"
                />
              </div>
              <div className="items-center gap-4">
                <Label htmlFor="plan-description" className="text-right">Description</Label>
                <Input
                  id="plan-description"
                  value={subscriptionFormData.description}
                  onChange={(e) => setSubscriptionFormData({...subscriptionFormData, description: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="items-center gap-4">
                <Label htmlFor="plan-status" className="text-right">Status</Label>
                <Select
                  value={subscriptionFormData.is_active.toString()}
                  onValueChange={(value) => setSubscriptionFormData({...subscriptionFormData, is_active: value === 'true'})}
                  className="w-full"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveSubscription}>{isEditModeSubscription ? 'Save Changes' : 'Create Plan'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Subscription Delete Confirmation */}
      <AlertDialog open={!!subscriptionToDelete} onOpenChange={(open) => !open && setSubscriptionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscription plan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubscription} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
      {isMobile ? (
        <Drawer open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
          <DrawerContent className="h-[85dvh]">
            <DrawerHeader className="text-xl font-semibold flex items-center gap-2">
              <Building className="h-5 w-5" /> Manage {selectedOrganization?.name}
            </DrawerHeader>

            <div className="flex-1 overflow-hidden px-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4 sticky top-0 z-10">
                  <TabsTrigger value="admins">Admin Users</TabsTrigger>
                  <TabsTrigger value="history">Subscription History</TabsTrigger>
                </TabsList>

              <div className="flex-1 overflow-y-auto px-1">
                <TabsContent value="admins" className="mt-0 h-full">
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <Card className="w-full md:w-80 shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{isEditModeUser ? 'Edit Admin User' : 'Add New Admin User'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
               
                  <Input 
                    id="user-username-mobile" 
                    placeholder="Username"
                    value={currentUserFormData.username} 
                    onChange={(e) => setCurrentUserFormData({...currentUserFormData, username: e.target.value})} 
                  />
                </div>
                <div>
                  <Label htmlFor={`${id}-password-mobile`}> {isEditModeUser && "leave blank to keep current password"}</Label>
                  <div className="relative">
                    <Input 
                      id={`${id}-password-mobile`} 
                      placeholder="Password"
                      type={isPasswordVisible ? "text" : "password"} 
                      value={currentUserFormData.password} 
                      onChange={(e) => setCurrentUserFormData({...currentUserFormData, password: e.target.value})} 
                      className="pe-9"
                      required={!isEditModeUser}
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
                  
                  {/* Mobile - Only show progress bar */}
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
                <div className="w-full">
  {isEditModeUser ? (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        onClick={() => { 
          setIsEditModeUser(false); 
          setCurrentUserFormData({...initialUserFormData, organization_id: selectedOrganization.id }); 
          setIsPasswordVisible(false); 
        }}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button onClick={handleSaveAdminUser} className="flex-1">
        Save
      </Button>
    </div>
  ) : (
    <Button onClick={handleSaveAdminUser} className="w-full">
      Add User
    </Button>
  )}
</div>
              </CardContent>
                </Card>

              <div className="flex-1 min-w-0">
              <h3 className="text-md font-semibold mb-3">Existing Admin Users</h3>
              {loadingAdmins ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : organizationAdmins.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No admin users found for this organization.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-300 bg-gray-50 rounded-lg">
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
                          <TableCell>{new Date(admin.created_at).toLocaleDateString('en-GB')}</TableCell>
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
            </div>
          </div>
            </TabsContent>
            
            <TabsContent value="history" className="mt-0 h-full">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : subscriptionHistory.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No subscription history found.
                    </div>
                  ) : (
                    <ScrollArea className="h-full w-full">
                      <div className="space-y-4">
                        {subscriptionHistory.map((history) => (
                          <motion.div
                            key={history.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white rounded-lg shadow p-4 border border-gray-200"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-medium text-lg">{history.plan_name}</h3>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${history.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {history.status}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Duration:</span>
                                <span className="font-medium">{history.duration_months} months</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Price:</span>
                                <span className="font-medium">₹{history.price}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Start Date:</span>
                                <span className="font-medium">{new Date(history.start_date).toLocaleDateString('en-GB')}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">End Date:</span>
                                <span className="font-medium">{history.end_date ? new Date(history.end_date).toLocaleDateString('en-GB') : '-'}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
              <DrawerFooter className="mt-4 border-t">
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full">Close</Button>
                </DrawerClose>
              </DrawerFooter>
        
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
          <DialogContent className="sm:max-w-[740px] h-[80dvh] sm:h-[80vh] w-full overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Building className="h-5 w-5" /> Manage {selectedOrganization?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4 sticky top-0 z-10">
                  <TabsTrigger value="admins">Admin Users</TabsTrigger>
                  <TabsTrigger value="history">Subscription History</TabsTrigger>
                </TabsList>
                <div className="flex-1 overflow-y-auto px-1">
                  <TabsContent value="admins" className="mt-0 h-full">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                      <Card className="w-full md:w-80 shrink-0">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{isEditModeUser ? 'Edit Admin User' : 'Add New Admin User'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                          
                            <Input 
                              id="user-username" 
                              placeholder="Username"
                              value={currentUserFormData.username} 
                              onChange={(e) => setCurrentUserFormData({...currentUserFormData, username: e.target.value})} 
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${id}-password`}> {isEditModeUser && "leave blank to keep current password"}</Label>
                            <div className="relative">
                              <Input 
                                id={`${id}-password`} 
                                placeholder="Password"
                                type={isPasswordVisible ? "text" : "password"} 
                                value={currentUserFormData.password} 
                                onChange={(e) => setCurrentUserFormData({...currentUserFormData, password: e.target.value})} 
                                className="pe-9"
                                required={!isEditModeUser}
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
                            
                            {/* Desktop - Show progress bar and requirements */}
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
                          <div className="flex gap-2 pt-2">
  {isEditModeUser && (
    <Button 
      variant="outline" 
      onClick={() => { 
        setIsEditModeUser(false); 
        setCurrentUserFormData({...initialUserFormData, organization_id: selectedOrganization.id }); 
        setIsPasswordVisible(false); 
      }}
      className="flex-1"
    >
      Cancel
    </Button>
  )}
  <Button onClick={handleSaveAdminUser} className="flex-1">
    {isEditModeUser ? 'Save' : 'Add User'}
  </Button>
</div>
                        </CardContent>
                      </Card>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-md font-semibold mb-3">Existing Admin Users</h3>
                        {loadingAdmins ? (
                          <div className="flex justify-center items-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : organizationAdmins.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">No admin users found for this organization.</p>
                        ) : (
                          <div className="overflow-x-auto border border-gray-300 bg-gray-50 rounded-lg">
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
                                    <TableCell>{new Date(admin.created_at).toLocaleDateString('en-GB')}</TableCell>
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
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="history" className="mt-0 h-full">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : subscriptionHistory.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        No subscription history found.
                      </div>
                    ) : (
                      <ScrollArea className="h-full w-full">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Plan</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subscriptionHistory.map((history) => (
                              <TableRow key={history.id}>
                                <TableCell>{history.plan_name}</TableCell>
                                <TableCell>{history.duration_months} months</TableCell>
                                <TableCell>₹{history.price}</TableCell>
                                <TableCell>{new Date(history.start_date).toLocaleDateString('en-GB')}</TableCell>
                                <TableCell>{history.end_date ? new Date(history.end_date).toLocaleDateString('en-GB') : '-'}</TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${history.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {history.status}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <DialogFooter >
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext"; // Corrected path assuming contexts is in src/contexts

// Function to load Razorpay script
const loadRazorpayScript = (src) => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

const SubscriptionPlansDialog = ({ isOpen, onClose, organizationId, userEmail, userName, userPhone }) => { // Added user details props
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [hideDialogForRazorpay, setHideDialogForRazorpay] = useState(false); // State to manage dialog visibility during Razorpay interaction
  const { user } = useAuth(); // Get user from AuthContext

  // Fetch subscription plans from Supabase
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        toast.error('Failed to load subscription plans');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  // Handle subscription renewal
  const handleRenewSubscription = async () => {
    const res = await loadRazorpayScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      return;
    }
    if (!selectedPlan) {
      toast.error('Please select a subscription plan');
      return;
    }

    try {
      setProcessing(true);

      // IMPORTANT: Order creation should happen on your backend for security.
      // This is a simplified frontend example.
      // In a real app, you'd call your backend API here to create an order
      // and get back an order_id from Razorpay.
      // For this example, we'll simulate some parts.

      const amountInPaise = selectedPlan.price * 100; // Razorpay expects amount in paise

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amountInPaise,
        currency: "INR",
        name: "Grooming App Subscription",
        description: `Renewal for ${selectedPlan.name}`,
        // image: "/your_logo.png", // Optional: Add your logo URL
        // order_id: "order_DBJOWzybf0sJbb", // This should come from your backend
        handler: async function (response) {
          // alert(response.razorpay_payment_id);
          // alert(response.razorpay_order_id);
          // alert(response.razorpay_signature);
          
          // STEP 2: Verify Payment Signature (should be done on backend)
          // For now, we'll assume payment is successful and proceed
          toast.success('Payment successful! Processing subscription...');

          const now = new Date();
          const endDate = new Date(now);
          endDate.setMonth(now.getMonth() + selectedPlan.duration_months);

          // Ensure selectedPlan and organizationId are valid before DB operations
          if (!selectedPlan || !selectedPlan.id) {
            console.error('Error: selectedPlan or selectedPlan.id is missing before DB update.');
            toast.error('Subscription plan details are missing. Cannot update subscription.');
            setProcessing(false);
            return;
          }
          if (!organizationId) {
            console.error('Error: organizationId is missing before DB update.');
            toast.error('Organization ID is missing. Cannot update subscription.');
            setProcessing(false);
            return;
          }

          // Update organization and subscription history in Supabase
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .update({
              subscription_status: 'active',
              subscription_plan_id: selectedPlan.id,
              subscription_end_date: endDate.toISOString(),
              updated_at: new Date().toISOString(),
              // Optionally store payment details if needed
              // last_payment_id: response.razorpay_payment_id,
            })
            .eq('id', organizationId)
            .select();

          if (orgError) {
            console.error('Error updating organization:', orgError);
            toast.error(`Failed to update organization: ${orgError.message}`);
            setProcessing(false); // Stop processing on error
            return; // Exit if organization update fails
          }

          const { error: historyError } = await supabase
            .from('subscription_history')
            .insert([
              {
                organization_id: organizationId,
                subscription_plan_id: selectedPlan.id,
                plan_name: selectedPlan.name,
                duration_months: selectedPlan.duration_months,
                price: selectedPlan.price,
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                status: 'active',
                payment_id: response.razorpay_payment_id, // Store payment ID
                // payment_order_id: response.razorpay_order_id, // Store order ID
              }
            ]);

          if (historyError) {
            console.error('Error inserting into subscription_history:', historyError);
            toast.error(`Failed to save subscription history: ${historyError.message}`);
            // Potentially roll back organization update or flag for admin review
            setProcessing(false); // Stop processing on error
            return; // Exit if history insert fails
          }

          toast.success('Subscription renewed successfully!');
          setHideDialogForRazorpay(false); // Show our dialog again (or rather, allow it to be shown if parent state permits)
          onClose();
          window.location.reload(); // Refresh to reflect changes
        },
        prefill: {
          name: userName || user?.user_metadata?.full_name || "", // Get from props or auth context
          email: userEmail || user?.email || "",
          contact: "" // Removed phone prefill as requested
        },
        notes: {
          address: "Grooming App Corporate Office"
        },
        theme: {
          color: "#DB2777" // Pink color to match your theme
        },
        modal: {
          ondismiss: function() {
            setHideDialogForRazorpay(false);
            if (processing) { // Only if processing was true, implies Razorpay was opened
              setProcessing(false); // Reset processing if user just closes Razorpay modal
              toast.info('Payment process cancelled by user.');
            }
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      setHideDialogForRazorpay(true); // Hide our dialog before Razorpay opens
      paymentObject.on('payment.failed', function (response){
        // alert(response.error.code);
        // alert(response.error.description);
        // alert(response.error.source);
        // alert(response.error.step);
        // alert(response.error.reason);
        // alert(response.error.metadata.order_id);
        // alert(response.error.metadata.payment_id);
        toast.error(`Payment Failed: ${response.error.description}`);
        setProcessing(false);
        setHideDialogForRazorpay(false); // Show our dialog again
      });
      paymentObject.open();

    } catch (error) {
      console.error('Error initiating Razorpay payment or renewing subscription:', error);
      toast.error('Failed to process payment or renew subscription.');
      setProcessing(false); // Ensure processing is set to false on error
      setHideDialogForRazorpay(false); // Ensure dialog is shown if there was an error before Razorpay opened
    }
    // Do not setProcessing(false) here if Razorpay modal is open, it's handled in callbacks
  };

  return (
    <Dialog open={isOpen && !hideDialogForRazorpay} onOpenChange={(open) => {
      if (!open && processing && hideDialogForRazorpay) {
        // If dialog is closed externally while Razorpay is supposed to be open and our dialog is hidden,
        // ensure we reset hideDialogForRazorpay and processing states.
        setHideDialogForRazorpay(false);
        setProcessing(false);
      }
      onClose(); // Call the original onClose handler
    }}>
      {/* If isOpen is true but hideDialogForRazorpay is true, Dialog won't be open. */}
      {/* This effectively hides our dialog when Razorpay is active. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Renew Subscription</DialogTitle>
          <DialogDescription>
            Choose a subscription plan to continue using our services.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500">No subscription plans available.</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedPlan?.id === plan.id ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 hover:border-pink-300'}`}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-lg">{plan.name}</h3>
                    <p className="text-gray-500 text-sm">{plan.description}</p>
                    <p className="mt-2">
                      <span className="font-bold text-lg">₹{plan.price}</span>
                      <span className="text-gray-500 text-sm"> / {plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}</span>
                    </p>
                  </div>
                  {selectedPlan?.id === plan.id && (
                    <CheckCircle className="h-6 w-6 text-pink-600" />
                  )}
                </div>
                
              
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button 
            onClick={handleRenewSubscription} 
            disabled={!selectedPlan || processing || loading}
            className="bg-pink-600 hover:bg-pink-700"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Renew Subscription'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlansDialog;
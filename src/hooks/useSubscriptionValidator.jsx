// src/hooks/useSubscriptionValidator.js
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import SubscriptionExpiredModal from '../components/SubscriptionExpiredModal.jsx';
import SubscriptionPlansDialog from '../components/SubscriptionPlansDialog.jsx'; // Import the dialog
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

/**
 * Hook to validate subscription status on specific route changes
 * This hook will check if the user's organization has an active subscription
 * and show a subscription expired modal if it doesn't
 */
export function useSubscriptionValidator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [organizationIdForRenewal, setOrganizationIdForRenewal] = useState(null);
  const { user } = useAuth(); // Get user from auth context

  useEffect(() => {
    const validateSubscription = async () => {
      const storedSession = localStorage.getItem('userSession');
      if (!storedSession) return;

      try {
        const parsedUser = JSON.parse(storedSession);
        
        // Fetch the organization details
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', parsedUser.organization_id)
          .single();
        
        if (error) throw error;
        
        // Check if subscription is active
        if (
          data.subscription_status !== 'active' ||
          (data.subscription_end_date &&
           new Date(data.subscription_end_date) < new Date())
        ) {
          // Show expired modal and renewal dialog option
          setOrganizationIdForRenewal(data.id); // Store org ID for renewal
          setShowExpiredModal(true); 
          // setShowRenewDialog(true); // Optionally open renew dialog directly or via modal button
        } else {
          // Ensure modal is hidden if subscription is active
          setShowExpiredModal(false);
        }
      } catch (error) {
        console.error('Error validating subscription:', error);
      }
    };

    // Validate on all protected routes
    validateSubscription();
  }, [navigate, location.pathname]);

  // Return the modal component if subscription is expired
  // And the renewal dialog if triggered
  return (
    <>
      {showExpiredModal && (
        <SubscriptionExpiredModal 
          onClose={() => setShowExpiredModal(false)}
          onRenew={() => {
            setShowExpiredModal(false); // Close expired modal
            setShowRenewDialog(true); // Open renew dialog
          }}
        />
      )}
      {showRenewDialog && organizationIdForRenewal && (
        <SubscriptionPlansDialog 
          isOpen={showRenewDialog}
          onClose={() => setShowRenewDialog(false)}
          organizationId={organizationIdForRenewal}
          userName={user?.user_metadata?.full_name}
          userEmail={user?.email}
          userPhone={user?.phone}
        />
      )}
    </>
  );

}
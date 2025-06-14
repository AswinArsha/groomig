// src/utils/subscriptionValidator.js
import { supabase } from "../supabase";
import toast from "react-hot-toast";

/**
 * Validates if the user's organization has an active subscription
 * This function is called only when navigating to specific routes (home and analytics)
 * @returns {Promise<boolean>} True if subscription is active, false otherwise
 */
export const validateSubscription = async () => {
  try {
    // Get the organization ID from the user session
    const storedSession = localStorage.getItem('userSession');
    if (!storedSession) return false;
    
    const parsedUser = JSON.parse(storedSession);
    
    // Fetch the organization details with subscription status
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
      // Subscription is inactive or expired
      return false;
    }
    
    // Subscription is valid
    return true;
  } catch (error) {
    console.error('Error validating subscription:', error);
    return false;
  }
};

/**
 * Handles logout when subscription is invalid
 * @param {Function} navigate - React Router's navigate function
 */
export const handleInvalidSubscription = (navigate) => {
  // Clear user session
  localStorage.removeItem('userSession');
  
  // Redirect to login page
  navigate('/');
};
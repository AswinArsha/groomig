// src/components/SubscriptionValidator.jsx
import { useSubscriptionValidator } from '../hooks/useSubscriptionValidator.jsx';

/**
 * Component that validates subscription status on protected routes
 * This component renders a modal if the subscription has expired
 */
export default function SubscriptionValidator() {
  // Use the subscription validator hook which now returns a modal component if needed
  const subscriptionModal = useSubscriptionValidator();
  
  // Return the modal if subscription is expired, otherwise null
  return subscriptionModal;
}
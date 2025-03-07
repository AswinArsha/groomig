// twilioService.js
import { supabase } from "../supabase";

const CONTENT_SID = import.meta.env.VITE_TWILIO_CONTENT_SID;
const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL || 
  'https://exkscztgagvuuxjhvypk.supabase.co/functions/v1/send-whatsapp-notification';

/**
 * Sends a WhatsApp confirmation message to the customer using Twilio via Supabase Edge Function
 * @param {Object} bookingData The booking data object
 * @param {Object} shopDetails The shop details object
 * @returns {Promise} Result of the Twilio API call
 */
export const sendWhatsAppConfirmation = async (bookingData, shopDetails) => {
  try {
    // Format the mobile number for India (add country code if not present)
    let formattedNumber = bookingData.contact_number;
    if (!formattedNumber.startsWith('+91')) {
      formattedNumber = formattedNumber.startsWith('91') 
        ? `+${formattedNumber}` 
        : `+91${formattedNumber}`;
    }
    
    // Remove any spaces, dashes, or parentheses
    formattedNumber = formattedNumber.replace(/[\s\(\)\-]/g, '');

    console.log("Sending WhatsApp to:", formattedNumber);
    
    // Format the date and time for display
    const formattedDate = new Date(bookingData.booking_date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const formattedTime = bookingData.slot_time;
    
    // Prepare the variables to replace placeholders in the template
    const contentVariables = {
      "1": bookingData.customer_name, // Customer's name
      "2": formattedDate, // Appointment date
      "3": shopDetails.name, // Shop name
      "4": formattedTime, // Appointment time
      "5": bookingData.dog_name, // Dog's name
      "6": bookingData.dog_breed, // Dog's breed
      "7": shopDetails.directions || "Contact shop for directions" // Shop directions or map link
    };

    console.log("Request payload:", {
      to: formattedNumber,
      contentSid: import.meta.env.VITE_TWILIO_CONTENT_SID,
      contentVariables
    });
    
    // Call the Supabase Edge Function
    const response = await fetch(import.meta.env.VITE_SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: formattedNumber,
        contentSid: import.meta.env.VITE_TWILIO_CONTENT_SID,
        contentVariables
      })
    });

    console.log("Response status:", response.status);
    
    let responseData;
    try {
      responseData = await response.json();
      console.log("Response data:", responseData);
    } catch (e) {
      console.error("Failed to parse response:", e);
      throw new Error(`Server responded with status ${response.status} but response couldn't be parsed`);
    }

    if (!response.ok) {
      throw new Error(responseData.error || `Failed with status: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    // Return a consistent error format but don't throw
    return { success: false, error: error.message };
  }
};
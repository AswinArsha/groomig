// supabase/functions/send-whatsapp-notification/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Get environment variables
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
serve(async (req)=>{
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Try to parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON body'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { to, contentSid, contentVariables } = requestBody;
    // Validate required parameters
    if (!to || !contentSid || !contentVariables) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if Twilio credentials are available
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      return new Response(JSON.stringify({
        error: 'Twilio credentials not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Format WhatsApp numbers
    const toWhatsAppNumber = `whatsapp:${to}`;
    const fromWhatsAppNumber = `whatsapp:${TWILIO_PHONE_NUMBER}`;
    // Build the Twilio API endpoint
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    // Create authorization header
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    // Build form data
    const formData = new URLSearchParams();
    formData.append('From', fromWhatsAppNumber);
    formData.append('To', toWhatsAppNumber);
    formData.append('ContentSid', contentSid);
    formData.append('ContentVariables', JSON.stringify(contentVariables));
    // Call Twilio API
    const twilioResponse = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: formData.toString()
    });
    // Parse Twilio response
    const twilioResult = await twilioResponse.json();
    // Check if Twilio call was successful
    if (!twilioResponse.ok) {
      console.error('Twilio API error:', JSON.stringify(twilioResult));
      return new Response(JSON.stringify({
        success: false,
        error: twilioResult.message || 'Twilio API error'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      messageSid: twilioResult.sid,
      status: twilioResult.status
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // Log the error
    console.error('Function error:', error.message);
    // Return error response
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

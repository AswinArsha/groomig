// src/components/Home.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BookingForm from "./Home/BookingForm"; 
import BookingTable from "./Home/BookingTable";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { supabase } from "../supabase";


function Home() {
  const navigate = useNavigate(); // Initialize useNavigate
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check if subscription is inactive
  const isSubscriptionInactive = subscriptionDetails?.subscription_status !== 'active';
  
  // Fetch subscription details
  useEffect(() => {
    const fetchSubscription = async () => {
      setLoading(true);
      try {
        // Get user session from localStorage first
        const storedSession = localStorage.getItem('userSession');
        if (!storedSession) {
          throw new Error('No user session found');
        }

        const parsedUser = JSON.parse(storedSession);
        if (!parsedUser?.organization_id) {
          throw new Error('No organization ID found in user session');
        }

        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', parsedUser.organization_id)
          .order('subscription_end_date', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        setSubscriptionDetails(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  return (
    <div className="-m-4 mt-1 min-h-screen ">
      <div className="space-x-4 ml-4 ">
        {/* New Booking Dialog */}
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="mb-4" 
              disabled={isSubscriptionInactive}
              style={isSubscriptionInactive ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
            >
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              {/* Optional: Add a title if needed */}
            </DialogHeader>
            <BookingForm 
      onSuccess={() => setIsDialogOpen(false)}
           onSave={() => {}} />
          </DialogContent>
        </Dialog>

        <Button 
          onClick={() => !isSubscriptionInactive && navigate("/all-bookings")}
          disabled={isSubscriptionInactive}
          style={isSubscriptionInactive ? { cursor: 'not-allowed', opacity: 0.5 } : {}}
        >
            View All Bookings
          </Button>
      </div>
      
      {/* Booking Table */}
      <BookingTable />
    </div>
  );
}

export default Home;

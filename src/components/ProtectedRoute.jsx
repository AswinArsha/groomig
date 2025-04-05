// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../supabase";
import { motion } from "framer-motion";

function ProtectedRoute() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUser = async () => {
      // Check for stored session first
      const storedSession = localStorage.getItem('userSession');
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);
        setUser(sessionData);
        setLoading(false);
        return;
      }

      // If no stored session, check Supabase auth
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error fetching session:", error.message);
        setLoading(false);
        return;
      }

      if (session?.user) {
        const sessionData = {
          type: 'admin',
          email: session.user.email
        };
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        setUser(sessionData);
      }
      
      setLoading(false);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('userSession');
          setUser(null);
        } else if (session?.user) {
          const sessionData = {
            type: 'admin',
            email: session.user.email
          };
          localStorage.setItem('userSession', JSON.stringify(sessionData));
          setUser(sessionData);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-white/80 backdrop-blur-sm">
        <motion.div
          className="w-12 h-12 border-2 border-transparent border-t-pink-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/" replace />;
}

export default ProtectedRoute;

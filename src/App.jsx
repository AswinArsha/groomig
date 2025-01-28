// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import LoginForm from "./components/LoginForm";
import Sidebar from "./components/Sidebar"; 

import Service from "./components/Catalog";
import Billing from "./components/Billing";
import Home from "./components/Home";
import NotFound from "./components/NotFound"; // Ensure this component exists
import ProtectedRoute from "./components/ProtectedRoute"; // Import the ProtectedRoute
import ManageTimeSlotsPage from "./components/Home/ManageTimeSlotsPage"; // Import the new page
import BookingDetails from "./components/Home/BookingDetails"; // Import the new BookingDetails component
import toast, { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <SidebarProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<LoginForm />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Sidebar />}>
              <Route path="/home" element={<Home />} />
           
              <Route path="/bookings/:id" element={<BookingDetails />} /> {/* New Route */}
              <Route path="/service" element={<Service />} />
              <Route path="/billing" element={<Billing />} />
              {/* New Route for Manage Time Slots */}
              <Route path="/manage-time-slots" element={<ManageTimeSlotsPage />} />
            </Route>
          </Route>
  
          {/* Catch-all route for undefined paths */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SidebarProvider>
    </Router>
  );
}

export default App;

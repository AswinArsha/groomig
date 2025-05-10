// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import LoginForm from "./components/LoginForm";
import Sidebar from "./components/Sidebar";
import Home from "./components/Home";
import Shop from "./components/Catalog";
import Analytics from "./components/Analytics";
import NotFound from "./components/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import ManageTimeSlotsPage from "./components/Home/ManageTimeSlotsPage";
import BookingDetails from "./components/Home/BookingDetails";
import AllBookingsPage from "./components/Home/AllBookingsPage";
import AllBookingDetails from "./components/Home/AllBookingDetails"; 
import toast, { Toaster } from "react-hot-toast";

// Import the new user components
import UserBookingForm from "./components/User/UserBookingForm";
import UserLayout from "./components/User/UserLayout";

// Import Super Admin components
import SuperAdminLogin from "./components/SuperAdmin/SuperAdminLogin";
import SuperAdminDashboard from "./components/SuperAdmin/SuperAdminDashboard";
import SuperAdminProtectedRoute from "./components/SuperAdmin/SuperAdminProtectedRoute";

function App() {
  return (
    <Router>
      <SidebarProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<LoginForm />} />
          
          {/* Super Admin Routes */}
          <Route path="/admin" element={<SuperAdminLogin />} />
          <Route element={<SuperAdminProtectedRoute />}>
            <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
          </Route>

          {/* User Booking Route */}
          <Route path="/user" element={<UserLayout />}>
            <Route index element={<UserBookingForm />} />
          </Route>
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Sidebar />}>
              <Route path="/home" element={<Home />} />
              <Route path="/bookings/:id" element={<BookingDetails />} />
              <Route path="/all-bookings" element={<AllBookingsPage />} />
              <Route path="/all-booking-details/:id" element={<AllBookingDetails />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/manage-time-slots" element={<ManageTimeSlotsPage />} />
            </Route>
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SidebarProvider>
    </Router>
  );
}

export default App;
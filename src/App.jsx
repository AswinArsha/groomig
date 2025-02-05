// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import LoginForm from "./components/LoginForm";
import Sidebar from "./components/Sidebar";
import Home from "./components/Home";
import Service from "./components/Catalog";
import Billing from "./components/Billing";
import NotFound from "./components/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import ManageTimeSlotsPage from "./components/Home/ManageTimeSlotsPage";
import BookingDetails from "./components/Home/BookingDetails";
import AllBookingsPage from "./components/Home/AllBookingsPage";
import AllBookingDetails from "./components/Home/AllBookingDetails"; 
import toast, { Toaster } from "react-hot-toast";

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
              <Route path="/bookings/:id" element={<BookingDetails />} />
              <Route path="/all-bookings" element={<AllBookingsPage />} />
              <Route path="/all-booking-details/:id" element={<AllBookingDetails />} />
              <Route path="/service" element={<Service />} />
              <Route path="/billing" element={<Billing />} />
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

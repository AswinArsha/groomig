// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import LoginForm from "./components/LoginForm";
import Sidebar from "./components/Sidebar"; 
import Bookings from "./components/Bookings";
import Catalog from "./components/Catalog";
import Billing from "./components/Billing";
import Home from "./components/Home";
import toast, { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <SidebarProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<LoginForm />} />
          {/* Use Sidebar for all authenticated routes without a specific base path */}
          <Route element={<Sidebar />}>
            <Route path="/home" element={<Home />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/billing" element={<Billing />} />
          </Route>
        </Routes>
      </SidebarProvider>
    </Router>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar"; // Ensure this import matches your context implementation
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";
import Bookings from "./components/Bookings";
import Catalog from "./components/Catalog";
import Billing from "./components/Billing";
import Home from "./components/Home";
import toast, { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <SidebarProvider>
       
      <Toaster 
         position="top-right"
         /> 
        <Routes>
          <Route path="/" element={<LoginForm />} />
          <Route path="/dashboard" element={<Dashboard />}>
            <Route path="bookings" element={<Bookings />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="billing" element={<Billing />} />
            <Route path="home" element={<Home />} />
          </Route>
        </Routes>
      </SidebarProvider>
    </Router>
  );
}

export default App;

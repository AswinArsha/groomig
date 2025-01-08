import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

function Dashboard() {
  const location = useLocation();

  const getHeaderText = () => {
    switch (location.pathname) {
      case "/dashboard/home":
        return "Home";
      case "/dashboard/bookings":
        return "Bookings";
      case "/dashboard/catalog":
        return "Catalog";
      case "/dashboard/billing":
        return "Billing";
      default:
        return "Dashboard";
    }
  };

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col w-0">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-white px-6">
          <h1 className="text-lg font-semibold tracking-tight">
            {getHeaderText()}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
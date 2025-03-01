// src/components/User/UserLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";
import logo from "../../assets/logo.jpg";

const UserLayout = () => {
  return (
    <div className="w-full bg-gray-50">
      {/* Header */}
      <header className="bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center items-center">
          <Link to="/user" className="flex items-center space-x-3">
            <img src={logo} alt="DogGroomingService" className="h-6 sm:h-8 md:h-10 object-contain" />
            <span className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">White Dog</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-2xl">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-6 mt-12 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center">
            <div className="text-sm text-gray-500 text-center">
              &copy; {new Date().getFullYear()} WhiteDog . All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UserLayout;
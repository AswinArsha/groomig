import React from "react";
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="text-center max-w-md">
        {/* 404 Number */}
        <h1 className="text-9xl font-black text-gray-200">404</h1>

        {/* Heading */}
        <p className="text-2xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Uh-oh!
        </p>

        {/* Description */}
        <p className="mt-4 text-gray-500">
          We can't find that page.
        </p>

        {/* Go Home Button */}
        <Link
          to="/home"
          className="mt-6 inline-block rounded-md bg-pink-600 px-6 py-3 text-sm font-medium text-white hover:bg-pink-700 transition focus:ring-4 focus:ring-pink-300 focus:outline-none"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;

"use client";

import React from 'react';
import { NavigationMenuDemo } from '@/components/navbar';

/**
 * A simple, elegant homepage component.
 * This acts as the main landing page for your app.
 * * NOTE: Swapped <Link> for <a> to make it previewable.
 */
export default function HomePage() {
  
  return (
    // Full-screen container, centers content
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
      {/* Content wrapper with max-width and centering */}
      <div className="text-center max-w-lg w-full">


        <div className="flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold">Welcome to Flago</h1> 
          <p className="text-lg text-gray-500">Can't Decide? Let Flago help you BRO!</p>
        </div>

        {/* "Get Started" Button (using a standard <a> tag for preview) */}
        <a 
          href="/form" // THIS IS THE PLACEHOLDER LINK TO YOUR FORM PAGE
          onClick={(e) => e.preventDefault()} // Prevents preview from navigating
          className="
            inline-block
            px-10 py-6 text-lg font-bold 
            bg-indigo-600 hover:bg-indigo-500 
            text-white rounded-full
            shadow-lg shadow-indigo-500/30
            transition-all transform hover:scale-105
            focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75
            cursor-pointer
          "
        >
          Get Started
        </a>

      </div>
    </div>
  );
}
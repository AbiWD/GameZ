import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LocationNotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-6xl font-bold text-primary font-serif">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 font-serif">Location Not Found</h2>
        <p className="text-gray-600">
          We're having trouble finding this location. It may have moved or is temporarily unavailable. Please explore our other properties below or contact us for help.
        </p>
        <a 
          href="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors"
        >
          Explore All Locations
        </a>
      </div>
    </div>
  );
};

export default LocationNotFound;

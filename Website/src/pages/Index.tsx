import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { useProperty } from "@/contexts/PropertyContext";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { pb } from "@/lib/pocketbase";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Stations from "@/components/Stations";
import Amenities from "@/components/Amenities";
import Experiences from "@/components/Experiences";
import Gallery from "@/components/Gallery";
import Location from "@/components/Location";
import Reviews from "@/components/Reviews";
import Booking from "@/components/Booking";
import Footer from "@/components/Footer";

const Index = () => {
  const { activeProperty } = useProperty();
  const { settings } = useBrandSettings();
  const { content } = useWebsiteContent(activeProperty?.id);

  if (!activeProperty) {
    return <Navigate to="/location-not-found" replace />;
  }

  const pageTitle = `${activeProperty.name}${settings?.brand_name ? ` - ${settings.brand_name}` : ""}`;
  
  // Create a clean SEO description by stripping HTML if any, or grabbing text excerpts.
  const pageDescription = settings?.about_description || settings?.footer_description || `Experience the best gaming experience at ${activeProperty.name}.`;
  
  // For OpenGraph image, hero_video could actually be an image, so we check extension.
  // Otherwise we fallback to the global brand logo.
  let ogImage = undefined;
  if (content?.hero_video && content.hero_video.match(/\.(jpeg|jpg|png|webp|gif)$/i)) {
    ogImage = pb.files.getUrl(content, content.hero_video);
  } else if (settings?.logo_image) {
    ogImage = pb.files.getUrl(settings, settings.logo_image);
  }

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
      </Helmet>

      <Navbar />
      <Hero />
      <About />
      <Stations />
      <Amenities />
      <Experiences />
      <Gallery />
      <Location />
      <Reviews />
      <Booking />
      <Footer />
    </div>
  );
};

export default Index;

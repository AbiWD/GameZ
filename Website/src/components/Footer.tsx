import { MapPin, Phone, Mail, Facebook, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useProperty } from "@/contexts/PropertyContext";
import { useBrandSettings } from "@/hooks/useBrandSettings";

const Footer = () => {
  const { activeProperty } = useProperty();
  const { content } = useWebsiteContent(activeProperty?.id);
  const { settings } = useBrandSettings();

  // Settings Cascading Logic
  const brandName = settings?.brand_name || "Your Brand Name";
  
  // Local description (if provided) overrides the Global description!
  const footerDesc = content?.footer_description || settings?.footer_description || "A brief description of your property goes here. Experience unrivaled serenity.";
  
  const address = activeProperty?.address || content?.property_address || "Select a location to see address details.";
  const phone = activeProperty?.phone || content?.contact_phone || "Contact details unavailable";
  const email = activeProperty?.email || content?.contact_email || "Email unavailable";
  
  const proprietor = content?.proprietor_name || "Management";
  
  const currentYear = new Date().getFullYear();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const navHeight = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - navHeight;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <footer className="bg-primary text-primary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-10 lg:gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <h3 className="font-playfair text-2xl font-bold">{brandName}</h3>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              {footerDesc}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { label: "Home", id: "hero" },
                { label: "About Us", id: "about" },
                { label: "Rooms", id: "rooms" },
                { label: "Experiences", id: "experiences" },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* More Links */}
          <div>
            <h4 className="font-semibold mb-4">Explore</h4>
            <ul className="space-y-2">
              {[
                { label: "Gallery", id: "gallery" },
                { label: "Location", id: "location" },
                { label: "Reviews", id: "reviews" },
                { label: "Book Now", id: "booking" },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
              <li>
                <Link
                  to="/check-booking"
                  className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                >
                  Check Booking
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-semibold mb-4">Policies</h4>
            <ul className="space-y-2">
              {[
                { label: "Terms & Conditions", path: "/terms" },
                { label: "Privacy Policy", path: "/privacy" },
                { label: "Refund Policy", path: "/refund-policy" },
                { label: "Booking Policy", path: "/booking-policy" },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            {activeProperty ? (
               <ul className="space-y-3">
                 <li className="flex items-start gap-2 text-sm">
                   <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                   <span className="text-primary-foreground/80">
                     {address}
                   </span>
                 </li>
                 <li className="flex items-center gap-2 text-sm">
                   <Phone className="w-4 h-4 flex-shrink-0" />
                   <a
                     href={`tel:${phone.replace(/\s+/g, '')}`}
                     className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                   >
                     {phone}
                   </a>
                 </li>
                 <li className="flex items-center gap-2 text-sm">
                   <Mail className="w-4 h-4 flex-shrink-0" />
                   <a
                     href={`mailto:${email}`}
                     className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
                   >
                     {email}
                   </a>
                 </li>
               </ul>
            ) : (
               <p className="text-sm text-primary-foreground/80 italic">Please select a location above to view contact information.</p>
            )}

            <div className="flex gap-4 mt-4">
              {settings?.social_facebook && (
                <a
                  href={settings.social_facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {settings?.social_instagram && (
                <a
                  href={settings.social_instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center space-y-2">
          <p className="text-primary-foreground/70 text-sm">
            © {currentYear} {brandName}. All rights reserved.
          </p>
          {activeProperty && (
             <p className="text-primary-foreground/70 text-xs">
               Proprietor: {proprietor}
             </p>
          )}
          <p className="text-primary-foreground/90 text-xs mt-2">
            Powered By{" "}
            <a
              href="https://www.starchdata.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-primary-foreground font-semibold transition-colors underline underline-offset-2"
            >
              STARCHDATA
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

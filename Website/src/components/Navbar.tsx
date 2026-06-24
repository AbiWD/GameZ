import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Building2, ChevronDown } from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { pb } from "@/lib/pocketbase";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { properties, activeProperty, setActiveProperty } = useProperty();
  const { settings } = useBrandSettings();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    // If not on a location page (like terms or portal), scrolling to a local ID won't work.
    // Ideally we would redirect first.
    if (location.pathname !== '/' && !location.pathname.startsWith('/locations/')) {
       // Allow smooth scroll to fail gracefully for now if on a different page type
       // In a full implementation, you'd prepend the link URL
    }

    const element = document.getElementById(id);
    if (element) {
      const navHeight = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - navHeight;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: "Home", id: "hero" },
    { label: "About", id: "about" },
    { label: "Rooms", id: "rooms" },
    { label: "Experiences", id: "experiences" },
    { label: "Gallery", id: "gallery" },
    { label: "Location", id: "location" },
    { label: "Reviews", id: "reviews" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen
          ? "bg-background/95 backdrop-blur-md shadow-soft"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="font-playfair text-2xl font-bold text-primary hover:opacity-80 transition-opacity flex items-center gap-3"
          >
            {settings?.logo_image && (
              <img 
                src={pb.files.getUrl(settings, settings.logo_image)} 
                alt={settings.brand_name || "Logo"} 
                className="max-h-12 w-auto object-contain"
              />
            )}
            {settings?.brand_name && (
              <span>{settings.brand_name}</span>
            )}
            {!settings?.logo_image && !settings?.brand_name && (
              <span>Brand Portal</span>
            )}
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </button>
            ))}
            
            {/* Property Switcher */}
            {properties.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="font-medium flex items-center gap-2 hover:bg-primary/10 text-foreground">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="max-w-[150px] truncate">
                      {activeProperty ? activeProperty.name.split(',')[0] : "All Locations"}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[240px] rounded-[16px] shadow-xl border-none p-2 z-[60]">
                  {properties.map(prop => (
                    <DropdownMenuItem 
                       key={prop.id} 
                       onClick={() => setActiveProperty(prop)}
                       className={`py-3 px-4 mb-1 rounded-[8px] transition-colors hover:bg-muted cursor-pointer ${activeProperty?.id === prop.id ? 'bg-primary/10 font-bold text-primary' : ''}`}
                    >
                       {prop.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              onClick={() => scrollToSection("booking")}
              className="bg-gradient-tropical text-primary-foreground hover:opacity-90"
            >
              Book Now
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden animate-in slide-in-from-top-2 mt-4 pb-4 space-y-4 border-t border-border pt-4">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="block w-full text-left text-foreground hover:text-primary transition-colors font-medium py-2"
              >
                {link.label}
              </button>
            ))}
            
            {properties.length > 1 && (
              <div className="py-2 border-t border-border mt-2 pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-bold px-2">Change Location</p>
                <div className="grid grid-cols-1 gap-1">
                  {properties.map(prop => (
                    <button
                      key={prop.id}
                      onClick={() => { setActiveProperty(prop); setIsMobileMenuOpen(false); }}
                      className={`text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted ${activeProperty?.id === prop.id ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                    >
                      {prop.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button
              onClick={() => scrollToSection("booking")}
              className="w-full bg-gradient-tropical text-primary-foreground mt-4"
            >
              Book Now
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

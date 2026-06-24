import { useProperty } from "@/contexts/PropertyContext";
import { Link } from "react-router-dom";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { pb } from "@/lib/pocketbase";
import Footer from "@/components/Footer";
import About from "@/components/About";

const BrandPortal = () => {
  const { properties } = useProperty();
  const { settings } = useBrandSettings();

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col">
      {/* Header Mosaic Hero */}
      <div className="relative h-[60vh] w-full bg-primary flex items-center justify-center overflow-hidden shrink-0">
        <div className="absolute inset-0 grid grid-cols-2 lg:grid-cols-4 gap-0 opacity-20 mix-blend-overlay">
           {properties.map((p, i) => (
              <div key={p.id} className="bg-primary-foreground/10 w-full h-full border border-primary-foreground/5" />
           ))}
        </div>
        
        <div className="relative z-10 text-center space-y-6 max-w-3xl px-4 mt-8">
          {settings?.logo_image ? (
            <img 
               src={pb.files.getUrl(settings, settings.logo_image)} 
               alt={settings?.brand_name || "Logo"} 
               className="h-28 mx-auto object-contain"
            />
          ) : (
            <h1 className="text-5xl md:text-6xl font-playfair font-bold text-primary-foreground">
               {settings?.brand_name || "Our Resorts"}
            </h1>
          )}
          <p className="text-primary-foreground/90 text-lg md:text-xl font-medium tracking-wide">
            {settings?.footer_description || "Select a pristine location for your next getaway."}
          </p>
        </div>
      </div>

      <About />

      {/* Directory Section */}
      <div className="flex-grow container mx-auto px-4 py-20">
        <div className="text-center mb-16 space-y-4">
           <h2 className="text-4xl font-playfair font-bold text-foreground">Our Destinations</h2>
           <p className="text-muted-foreground max-w-2xl mx-auto">Explore our collection of handpicked properties designed for the perfect coastal escape.</p>
        </div>
        <div className={`grid gap-8 mx-auto ${
          properties.length === 1 ? "grid-cols-1 max-w-md" : 
          properties.length === 2 ? "md:grid-cols-2 max-w-4xl" : 
          "md:grid-cols-2 lg:grid-cols-3 max-w-6xl"
        }`}>
          {properties.map(p => (
            <Link 
               to={`/locations/${p.slug}`} 
               key={p.id}
               className="group relative rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl transition-all block h-96 bg-white"
            >
               {/* Location Card Image Fallback */}
               <div className="absolute inset-0 bg-muted group-hover:scale-105 transition-transform duration-700 ease-in-out">
                  <div className="w-full h-full bg-black/40 group-hover:bg-black/20 transition-colors absolute inset-0 z-10" />
                  <img 
                    src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop" 
                    alt={p.name} 
                    className="w-full h-full object-cover"
                  />
               </div>
               
               <div className="absolute inset-x-0 bottom-0 p-8 z-20 text-white bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                     <h3 className="text-3xl font-playfair font-bold mb-3">{p.name}</h3>
                     <p className="text-sm opacity-90 line-clamp-2 md:line-clamp-3 mb-4">{p.address}</p>
                     <span className="inline-flex items-center text-sm font-semibold uppercase tracking-wider">
                        Explore Resort <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                     </span>
                  </div>
               </div>
            </Link>
          ))}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default BrandPortal;

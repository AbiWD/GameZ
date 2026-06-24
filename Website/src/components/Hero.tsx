import { Button } from "@/components/ui/button";
import * as LucideIcons from "lucide-react";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useProperty } from "@/contexts/PropertyContext";
import { pb } from "@/lib/pocketbase";

const Hero = () => {
  const { activeProperty } = useProperty();
  const { content, loading } = useWebsiteContent(activeProperty?.id);

  const scrollToBooking = () => {
    const element = document.getElementById("booking");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const heroHeadline = content?.hero_headline || "Your Property Headline";
  const heroSubheadline = content?.hero_subheadline || "A brief descriptive subtitle goes here to welcome your guests.";
  
  const heroVideoUrl = content?.hero_video 
    ? pb.files.getUrl(content, content.hero_video)
    : "https://placehold.co/1920x1080?text=Upload+Your+Hero+Video+or+Image+Here";

  const isVideo = heroVideoUrl.match(/\.(mp4|webm|ogg)$/i) !== null;

  const defaultHighlights = [
    { icon: "MapPin", text: "Location Highlights" },
    { icon: "Heart", text: "Guest Experience" },
    { icon: "Star", text: "Premium Amenities" },
    { icon: "Home", text: "Comfortable Stay" },
  ];
  
  const highlights = content 
    ? (Array.isArray(content.hero_highlights) ? content.hero_highlights : [])
    : defaultHighlights;

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video with Overlay */}
      <div className="absolute inset-0 z-0">
        {isVideo ? (
          <video
            key={heroVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src={heroVideoUrl} type={heroVideoUrl.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
          </video>
        ) : (
          <img 
            key={heroVideoUrl}
            src={heroVideoUrl}
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-6 fade-in-up">
          <h1 className="text-5xl md:text-7xl font-playfair font-bold text-foreground leading-tight">
            {heroHeadline}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {heroSubheadline}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              size="lg"
              onClick={scrollToBooking}
              className="bg-gradient-tropical text-primary-foreground text-lg px-8 py-6 hover:opacity-90 transition-opacity shadow-medium"
            >
              Book a Station
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const element = document.getElementById("about");
                if (element) element.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-lg px-8 py-6 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Learn More
            </Button>
          </div>

          {/* Quick Highlights */}
          {highlights.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 pt-12 max-w-4xl mx-auto w-full">
              {highlights.map((item, index) => {
                // Create TitleCase version of the icon name just in case user typed lowercase
                const sanitizedIconName = item.icon.charAt(0).toUpperCase() + item.icon.slice(1);
                const IconComponent = (LucideIcons as any)[sanitizedIconName] || (LucideIcons as any)[item.icon] || LucideIcons.Leaf;
                
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-3 p-5 bg-card/80 backdrop-blur-md rounded-2xl shadow-soft border border-primary/10 hover:-translate-y-1 transition-transform cursor-default w-[calc(50%-0.5rem)] md:w-44 shrink-0"
                  >
                    <IconComponent className="w-8 h-8 text-primary" />
                    <span className="text-sm md:text-base font-semibold text-foreground text-center">
                      {item.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default Hero;

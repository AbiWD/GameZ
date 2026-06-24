import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, Car, ExternalLink } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";
import { useProperty } from "@/contexts/PropertyContext";

const Location = () => {
  const { activeProperty } = useProperty();
  const { content } = useWebsiteContent(activeProperty?.id);

  const gettingHere = (content?.getting_here && Array.isArray(content.getting_here) && content.getting_here.length > 0)
    ? content.getting_here
    : [
        { icon: "Car", title: "Mode of Transport 1", description: "Describe the primary way guests reach your property (e.g. driving directions)." },
        { icon: "Navigation", title: "Mode of Transport 2", description: "List alternative ways to reach your property, such as flights or trains." },
        { icon: "Clock", title: "Travel Time", description: "Give a rough estimate of time it takes from major hubs." },
      ];

  const gettingAround = (content?.getting_around && Array.isArray(content.getting_around) && content.getting_around.length > 0)
    ? content.getting_around
    : [
        "Explain local transit options here.",
        "List any transportation you provide or help arrange.",
        "Mention parking availability if applicable.",
        "Include any tips on navigating the local area.",
      ];

  const nearbyAttractions = (content?.nearby_attractions && Array.isArray(content.nearby_attractions) && content.nearby_attractions.length > 0)
    ? content.nearby_attractions
    : [
        { name: "Local Landmark 1", distance: "5 km", time: "10 mins" },
        { name: "Local Landmark 2", distance: "12 km", time: "25 mins" },
        { name: "Major Attraction", distance: "30 km", time: "45 mins" },
      ];

  const mapUrl = content?.google_maps_url || "";
  const address = content?.property_address || "";

  return (
    <section id="location" className="py-12 md:py-20 bg-muted/30 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-foreground mb-4">
            {content?.location_title || "Find Your Way to Paradise"}
          </h2>
          <div className="w-24 h-1 bg-gradient-tropical mx-auto mb-6" />
          <p className="text-lg text-secondary font-semibold">
            
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8 md:items-stretch">
          <Card className="shadow-medium flex flex-col">
            <CardContent className="p-6 flex-1">
              <h3 className="text-xl font-playfair font-semibold text-foreground mb-4">
                Getting Here
              </h3>
              <div className="space-y-4">
                {gettingHere.map((item, index) => {
                  const IconComp = (LucideIcons as any)[item.icon] || LucideIcons.Car;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="w-12 h-12 bg-gradient-tropical rounded-full flex items-center justify-center flex-shrink-0">
                        <IconComp className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="font-semibold text-foreground mb-3">Getting Around</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {gettingAround.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium flex flex-col">
            <CardContent className="p-6 flex-1">
              <h3 className="text-xl font-playfair font-semibold text-foreground mb-4">
                Nearby Attractions
              </h3>
              <div className="space-y-4">
                {nearbyAttractions.map((place, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium text-foreground">{place.name}</span>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{place.distance}</div>
                      {place.time && <div className="text-xs">{place.time}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Section */}
        <div className="bg-card rounded-lg overflow-hidden shadow-medium">
          <div className="h-64 w-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <div className="text-center p-6">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-playfair font-semibold text-foreground mb-2">
                {content?.location_map_title || activeProperty?.name || ""}
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                {address}
              </p>
              <Button
                onClick={() => window.open(mapUrl, "_blank")}
                className="bg-gradient-tropical text-primary-foreground hover:opacity-90"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Open in Google Maps
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Ideal for weekend getaways and extended stays • Perfect blend of accessibility and tranquility
          </p>
        </div>
      </div>
    </section>
  );
};

export default Location;

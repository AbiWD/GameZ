import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bed, Wind } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useProperty } from "@/contexts/PropertyContext";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const DUMMY_ROOMS = [
  {
    id: 'dummy-1',
    name: 'Coastal Premium Suite',
    base_price: 3500,
    specs: 'King Size Bed',
    features: ['Ocean View', 'Private Balcony', 'Air Conditioning', 'Mini Fridge'],
    amenities: ['Wifi', 'Tv', 'Coffee', 'Wind'],
    description: 'Experience luxury with uninterrupted views of the ocean. This placeholder station is waiting to be replaced by your real data from the admin panel.',
    is_popular: true,
    is_dummy: true,
    image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'dummy-2',
    name: 'Tropical Standard Station',
    base_price: 2000,
    specs: 'Queen Size Bed',
    features: ['Garden View', 'Air Conditioning', 'Station Service'],
    amenities: ['Wifi', 'Tv'],
    description: 'A cozy retreat nestled in tropical gardens. Once you add your first station in the admin portal, this preview will automatically disappear.',
    is_popular: false,
    is_dummy: true,
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop'
  }
];

const Stations = () => {
  const [stationTypes, setStationTypes] = useState<any[]>([]);
  const { activeProperty } = useProperty();
  const { content } = useWebsiteContent(activeProperty?.id);

  useEffect(() => {
    if (!activeProperty) return;
    
    const fetchLivePrices = async () => {
      try {
        const liveTypes = await pb.collection("station_types").getFullList({
          filter: `property_id = "${activeProperty.id}"`,
          sort: 'created'
        });
        setStationTypes(liveTypes);
      } catch (e) {
        console.error("Failed to fetch station types:", e);
      }
    };
    
    fetchLivePrices();

    // Subscribe to live pricing/metadata changes from Admin Panel
    pb.collection('station_types').subscribe('*', function () {
      fetchLivePrices();
    });

    return () => {
      pb.collection('station_types').unsubscribe('*');
    };
  }, [activeProperty]);

  // if (stationTypes.length === 0) return null; // We now use dummy data instead of collapsing!
  const activeStations = stationTypes.length > 0 ? stationTypes : DUMMY_ROOMS;
  return (
    <section id="stations" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-foreground mb-4">
            {content?.stations_title || "Stations & Pricing"}
          </h2>
          <div className="w-24 h-1 bg-gradient-tropical mx-auto mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {content?.stations_subtitle || "Choose from our comfortable stations designed for your perfect stay"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 relative">
          {activeStations.map((station) => {
            const imageUrl = station.is_dummy ? station.image : (station.image ? pb.files.getUrl(station, station.image) : '');
            return (
            <Card key={station.id} className={`overflow-hidden group hover:shadow-xl transition-all duration-300 border-border/50 ${station.is_dummy ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
              <div className="relative h-64 overflow-hidden bg-muted flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={station.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <Bed className="w-16 h-16 text-muted-foreground/30" />
                )}
                
                {/* Dummy State Overlay Badge */}
                {station.is_dummy && (
                  <Badge className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white border-none pointer-events-none uppercase tracking-widest text-[10px] sm:text-xs">
                    Preview Template
                  </Badge>
                )}

                {station.is_popular && (
                  <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground pointer-events-none">
                    Popular
                  </Badge>
                )}
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-playfair font-semibold text-foreground">
                    {station.name}
                  </h3>
                  <div className="text-right flex-shrink-0 ml-4">
                    <span className="text-2xl font-bold text-primary">₹{station.base_price}</span>
                    <p className="text-sm text-muted-foreground">per hour</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                  <Bed className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{station.specs || 'Standard Bed'}</span>
                </div>

                {station.features && Array.isArray(station.features) && station.features.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {station.features.slice(0, 4).map((feature: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Wind className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {station.amenities && Array.isArray(station.amenities) && station.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
                    {station.amenities.map((amenityName: string, idx: number) => {
                      const IconComp = (LucideIcons as any)[amenityName] || LucideIcons.Star;
                      return (
                        <div key={idx} className="text-primary" title={amenityName}>
                           <IconComp className="w-5 h-5" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {station.description && (
                  <p className="mt-4 text-sm text-muted-foreground">{station.description}</p>
                )}
              </CardContent>
            </Card>
          )})}
        </div>
      </div>
    </section>
  );
};

export default Stations;

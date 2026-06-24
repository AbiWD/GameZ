import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pb } from "@/lib/pocketbase";
import * as LucideIcons from "lucide-react";
import { Loader2, Star, Sparkles } from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Facility {
  id: string;
  title: string;
  description: string;
  icon: string;
  image?: string;
  is_dummy?: boolean;
}

const DUMMY_AMENITIES: Facility[] = [
  {
    id: "dummy-am-1",
    title: "Infinity Pool Preview",
    description: "Relax by our beautiful infinity pool overlooking the breathtaking coastal landscape. Add a real facility via the Admin Portal to clear this preview.",
    icon: "Waves",
    image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=2070&auto=format&fit=crop",
    is_dummy: true
  },
  {
    id: "dummy-am-2",
    title: "Fine Dining Excellence",
    description: "Experience world-class culinary delights crafted by our pristine chefs. Add a real facility via the Admin Portal to clear this preview.",
    icon: "Utensils",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop",
    is_dummy: true
  },
  {
    id: "dummy-am-3",
    title: "Spa & Wellness",
    description: "Rejuvenate your soul with our signature spa treatments and therapies. Add a real facility via the Admin Portal to clear this preview.",
    icon: "Flower2",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop",
    is_dummy: true
  }
];

const Perks = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeProperty } = useProperty();

  useEffect(() => {
    if (!activeProperty) return;
    
    const fetchFacilities = async () => {
      try {
        const records = await pb.collection('facilities').getFullList({
          filter: `property_id = "${activeProperty.id}"`,
          sort: 'created', // Earliest created first, or you can use order logic
        });
        setFacilities(records as unknown as Facility[]);
      } catch (error) {
        console.error("Failed to fetch facilities:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFacilities();
  }, [activeProperty]);

  if (loading) {
    return (
      <section className="py-16 bg-background min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </section>
    );
  }

  const activeFacilities = facilities.length > 0 ? facilities : DUMMY_AMENITIES;

  let displayFacilities = activeFacilities;
  if (activeFacilities.length > 0 && activeFacilities.length < 8) {
    displayFacilities = [...activeFacilities, ...activeFacilities, ...activeFacilities, ...activeFacilities];
  }

  return (
    <section className="py-12 md:py-16 bg-background scroll-mt-20">
      <div className="container mx-auto px-4 md:px-12">
        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-playfair font-bold text-foreground mb-4">
            Resort Facilities
          </h2>
          <div className="w-20 h-1 bg-gradient-tropical mb-6" />
        </div>

        <div className="relative w-full">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full relative"
          >
            <CarouselContent className="-ml-4 md:-ml-8">
            {displayFacilities.map((feature, index) => {
              const IconComp = (LucideIcons as any)[feature.icon] || Star;
              const imageUrl = feature.is_dummy ? feature.image : (feature.image ? pb.files.getUrl(feature as any, feature.image) : '');
              
              return (
                <CarouselItem key={`${feature.id}-${index}`} className="pl-4 md:pl-8 md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full overflow-hidden shadow-medium hover:shadow-lg transition-all duration-300">
                    <div className="relative h-64 overflow-hidden bg-muted">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={feature.title}
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <Sparkles className="w-12 h-12" />
                        </div>
                      )}
                      
                      {feature.is_dummy && (
                        <Badge className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white border-none pointer-events-none uppercase tracking-widest text-[10px] sm:text-xs z-20">
                          Preview Template
                        </Badge>
                      )}
                      <div className="absolute top-4 left-4 w-12 h-12 bg-gradient-tropical rounded-full flex items-center justify-center z-10 shadow-lg border-2 border-white/20">
                        <IconComp className="w-6 h-6 text-primary-foreground" />
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-2xl font-playfair font-semibold text-foreground mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              )
            })}
          </CarouselContent>
            
            <CarouselPrevious className="absolute -left-4 md:-left-8 z-20 border-[1.5px] border-[#c19d60] bg-white text-[#c19d60] hover:bg-[#c19d60]/5 hover:text-[#c19d60] w-12 h-12 flex shadow-sm" />
            <CarouselNext className="absolute -right-4 md:-right-8 z-20 border-[1.5px] border-[#c19d60] bg-white text-[#c19d60] hover:bg-[#c19d60]/5 hover:text-[#c19d60] w-12 h-12 flex shadow-sm" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default Perks;

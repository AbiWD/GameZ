import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pb } from "@/lib/pocketbase";
import * as LucideIcons from "lucide-react";
import { Loader2, Footprints } from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

interface Experience {
  id: string;
  title: string;
  description: string;
  icon: string;
  image?: string;
  is_dummy?: boolean;
}

const DUMMY_EXPERIENCES: Experience[] = [
  {
    id: "dummy-exp-1",
    title: "Sunset Coastline Cruise",
    description: "Embark on a mesmerizing journey along the coast as the sun dips below the horizon. A perfect preview experience easily replaceable in the Admin Portal.",
    icon: "Ship",
    image: "https://images.unsplash.com/photo-1503756234508-e32369269deb?q=80&w=2070&auto=format&fit=crop",
    is_dummy: true
  },
  {
    id: "dummy-exp-2",
    title: "Local Culinary Tour",
    description: "Discover the authentic taste of the region with our guided culinary walk through bustling local markets. This is a template waiting for your real data.",
    icon: "UtensilsCrossed",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=2070&auto=format&fit=crop",
    is_dummy: true
  }
];

const Experiences = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeProperty } = useProperty();
  const { content } = useWebsiteContent(activeProperty?.id);

  useEffect(() => {
    if (!activeProperty) return;

    const fetchExperiences = async () => {
      try {
        const records = await pb.collection('experiences').getFullList({
          filter: `property_id = "${activeProperty.id}"`,
          sort: 'created',
        });
        setExperiences(records as unknown as Experience[]);
      } catch (error) {
        console.error("Failed to fetch experiences:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExperiences();
  }, [activeProperty]);

  if (loading) {
    return (
      <section className="py-20 bg-muted/30 min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </section>
    );
  }

  const activeExperiences = experiences.length > 0 ? experiences : DUMMY_EXPERIENCES;

  return (
    <section id="experiences" className="py-12 md:py-20 bg-muted/30 scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-foreground mb-4">
            {content?.experiences_title || "Authentic Experiences"}
          </h2>
          <div className="w-24 h-1 bg-gradient-tropical mx-auto mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto whitespace-pre-wrap">
            {content?.experiences_subtitle || "Briefly introduce the kinds of experiences and activities available specifically at your property"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {activeExperiences.map((experience) => {
            const IconComp = (LucideIcons as any)[experience.icon] || Footprints;
            const imageUrl = experience.is_dummy ? experience.image : (experience.image ? pb.files.getUrl(experience as any, experience.image) : '');

            return (
              <Card
                key={experience.id}
                className="overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300 group"
              >
                {imageUrl && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={experience.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                    
                    {experience.is_dummy && (
                      <Badge className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white border-none pointer-events-none uppercase tracking-widest text-[10px] sm:text-xs z-20">
                        Preview Template
                      </Badge>
                    )}
                  </div>
                )}
                <CardContent className={imageUrl ? "p-6" : "p-8"}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-tropical rounded-full flex items-center justify-center flex-shrink-0">
                      <IconComp className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-playfair font-semibold text-foreground mb-2">
                        {experience.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {experience.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-12 bg-card rounded-lg p-8 shadow-soft">
          <h3 className="text-2xl font-playfair font-semibold text-center text-foreground mb-4">
            What Else You Can Enjoy
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {(content?.experiences_features && Array.isArray(content.experiences_features) && content.experiences_features.length > 0 
              ? content.experiences_features 
              : [
                "Highlight a popular activity for guests here",
                "List an on-site amenity or tour",
                "Mention a unique cultural experience",
                "Describe a special dining option",
                "Add any other engaging activity",
              ]
            ).map((item: string, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gradient-tropical flex-shrink-0" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Experiences;

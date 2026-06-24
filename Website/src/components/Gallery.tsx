import { useState, useEffect } from "react";
import { pb } from "@/lib/pocketbase";
import { useProperty } from "@/contexts/PropertyContext";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GalleryImage {
  id: string;
  title: string;
  image: string;
  is_dummy?: boolean;
}

const DUMMY_GALLERY: GalleryImage[] = [
  { id: "dummy-gal-1", title: "Resort Exterior", image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop", is_dummy: true },
  { id: "dummy-gal-2", title: "Lounge Area", image: "https://images.unsplash.com/photo-1618221118493-9cfa1a1c00da?q=80&w=2070&auto=format&fit=crop", is_dummy: true },
  { id: "dummy-gal-3", title: "Ocean View", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2070&auto=format&fit=crop", is_dummy: true },
  { id: "dummy-gal-4", title: "Dining Experience", image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2070&auto=format&fit=crop", is_dummy: true },
  { id: "dummy-gal-5", title: "Spa & Wellness", image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop", is_dummy: true },
];

const Gallery = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeProperty } = useProperty();

  useEffect(() => {
    if (!activeProperty) return;

    const fetchGallery = async () => {
      try {
        const records = await pb.collection('gallery').getFullList({
          filter: `property_id = "${activeProperty.id}"`,
          sort: 'created',
        });
        setImages(records as unknown as GalleryImage[]);
      } catch (error) {
        console.error("Failed to fetch gallery:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGallery();
  }, [activeProperty]);

  if (loading) {
    return (
      <section className="py-20 bg-background min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </section>
    );
  }

  const activeImages = images.length > 0 ? images : DUMMY_GALLERY;

  return (
    <section id="gallery" className="py-12 md:py-20 bg-background scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-foreground mb-4">
            Visual Journey
          </h2>
          <div className="w-24 h-1 bg-gradient-tropical mx-auto mb-6" />
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore the natural beauty and tranquil atmosphere of our property
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 auto-rows-[250px]">
          {activeImages.map((image, index) => {
            const isLarge = index === 0;
            const spanClass = isLarge ? "md:col-span-2 md:row-span-2" : "";
            const imageUrl = image.is_dummy ? image.image : pb.files.getUrl(image as any, image.image);

            return (
              <div
                key={image.id}
                className={`relative overflow-hidden rounded-lg shadow-medium hover:shadow-lg transition-all duration-300 group ${spanClass}`}
              >
                <img
                  src={imageUrl}
                  alt={image.title || "Gallery image"}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                {image.title && (
                  <div className="absolute bottom-0 left-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    <p className="text-[17px] font-bold text-white drop-shadow-md tracking-wide leading-tight">{image.title}</p>
                  </div>
                )}
                {image.is_dummy && (
                  <Badge className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white border-none pointer-events-none uppercase tracking-widest text-[10px] sm:text-xs z-20">
                    Preview Template
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Gallery;

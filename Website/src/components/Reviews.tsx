import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import { useProperty } from "@/contexts/PropertyContext";
import { Loader2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";

const DUMMY_REVIEWS = [
  { id: "dummy-rev-1", review_text: "Absolutely breathtaking! The attention to detail and impeccable service made our stay unforgettable. This is a preview template that will be replaced when you add your first real review.", guest_name: "Sarah Jenkins", is_dummy: true },
  { id: "dummy-rev-2", review_text: "A perfect slice of paradise. We couldn't have asked for a better experience. Once you add real reviews via the Admin Portal, these placeholders will vanish.", guest_name: "Michael Chen", is_dummy: true },
  { id: "dummy-rev-3", review_text: "The definitive five-star experience. The perfect blend of luxury and natural beauty. Add your own real guest testimonials to customize this section.", guest_name: "Elena Rodriguez", is_dummy: true },
];

const Reviews = () => {
  const { activeProperty } = useProperty();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", activeProperty?.id],
    queryFn: async () => {
      if (!activeProperty?.id) return [];
      const records = await pb.collection("reviews").getFullList({
        filter: `property_id = "${activeProperty.id}"`,
        sort: "-created",
        expand: "property_id"
      });
      return records;
    },
    enabled: !!activeProperty?.id,
  });

  if (isLoading) {
    return (
      <section id="reviews" className="py-24 bg-muted/20">
        <div className="container mx-auto px-4 flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </section>
    );
  }

  const activeReviews = (!reviews || reviews.length === 0) ? DUMMY_REVIEWS : reviews;

  return (
    <section id="reviews" className="py-12 md:py-20 bg-muted/20 scroll-mt-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-foreground mb-4">
            Testimonials
          </h2>
          <div className="w-24 h-1 bg-gradient-tropical mx-auto mb-6" />
        </div>

        <div className="px-6 md:px-16 max-w-5xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full relative"
          >
            <CarouselContent>
              {activeReviews.map((review) => (
                <CarouselItem key={review.id} className="pb-4">
                  <div className="bg-white rounded-[32px] md:rounded-[40px] p-8 md:px-12 md:py-10 shadow-lg shadow-black/5 relative w-full h-full border border-black/5">
                    
                    {/* Beautiful Serif Typography Quotes */}
                    <div className="absolute top-4 left-6 md:top-6 md:left-8 select-none">
                      <span className="font-playfair text-6xl md:text-8xl text-[#c19d60]/30 leading-none">
                        &ldquo;
                      </span>
                    </div>
                    <div className="absolute bottom-4 right-6 md:bottom-2 md:right-8 select-none">
                       <span className="font-playfair text-6xl md:text-8xl text-[#c19d60]/30 leading-none">
                        &rdquo;
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto pt-6 md:pt-4 pb-2 relative z-10">
                      <p className="text-foreground/80 md:text-lg leading-relaxed mb-6 min-h-[80px] flex items-center justify-center font-medium">
                        {review.review_text}
                      </p>
                      
                      <div className="flex flex-col items-center justify-center gap-1">
                        <h4 className="font-bold text-xl text-primary font-inter">
                          {review.guest_name}
                        </h4>
                        <p className="text-primary/70 text-sm">
                          {review.is_dummy ? 'Website Preview' : (review.expand?.property_id?.name || activeProperty?.name)}
                        </p>
                      </div>
                      
                      {review.is_dummy && (
                        <div className="absolute -top-4 right-0 md:top-4 md:right-4 z-20">
                          <Badge className="bg-black/70 backdrop-blur-md text-white border-none pointer-events-none uppercase tracking-widest text-[8px] sm:text-[10px]">
                            Preview Template
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            
            {/* Arrows perfectly straddling the border */}
            <CarouselPrevious className="absolute -left-6 z-20 border-[1.5px] border-[#c19d60] bg-white text-[#c19d60] hover:bg-[#c19d60]/5 hover:text-[#c19d60] w-12 h-12 flex shadow-sm" />
            <CarouselNext className="absolute -right-6 z-20 border-[1.5px] border-[#c19d60] bg-white text-[#c19d60] hover:bg-[#c19d60]/5 hover:text-[#c19d60] w-12 h-12 flex shadow-sm" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default Reviews;

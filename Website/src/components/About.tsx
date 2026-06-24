import * as LucideIcons from "lucide-react";
import { useBrandSettings } from "@/hooks/useBrandSettings";

const About = () => {
  const { settings } = useBrandSettings();

  const aboutTitle = settings?.about_title || "A Brief Introduction to Our Brand";
  const aboutSubtitle = settings?.about_subtitle || "Capture elements like your history or atmosphere.";
  
  const defaultDescription = "This section is where you bring the story of your brand to life. Talk about the kind of hospitality guests can expect, your key values, and what makes a stay at any of our resorts unique.";
  
  const aboutDescription = settings?.about_description || defaultDescription;
  const descriptionParagraphs = aboutDescription.split('\n').filter(p => p.trim() !== '');

  const defaultFeatures = [
    {
      icon: "MapPin",
      title: "Prime Locations",
      description: "Talk briefly about the diverse locations or experiences you offer.",
    },
    {
      icon: "Star",
      title: "Exceptional Service",
      description: "Highlight the specific service standard that sets your brand apart.",
    },
    {
      icon: "Home",
      title: "Unforgettable Stays",
      description: "Explain a third critical benefit of choosing your properties.",
    },
  ];

  const features = settings?.about_features?.length ? settings.about_features : defaultFeatures;

  return (
    <section id="about" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-playfair font-bold text-foreground mb-4">
              {aboutTitle}
            </h2>
            <div className="w-24 h-1 bg-gradient-tropical mx-auto mb-6" />
            <p className="text-lg text-muted-foreground">
              {aboutSubtitle}
            </p>
          </div>

          <div className="prose prose-lg max-w-none text-foreground/90 mb-12 leading-relaxed">
            {descriptionParagraphs.map((paragraph, index) => (
              <p key={index} className="text-center mb-6 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((item, index) => {
              const sanitizedIconName = item.icon.charAt(0).toUpperCase() + item.icon.slice(1);
              const IconComponent = (LucideIcons as any)[sanitizedIconName] || (LucideIcons as any)[item.icon] || LucideIcons.Star;

              return (
                <div
                  key={index}
                  className="bg-card p-6 rounded-lg shadow-soft hover:shadow-medium transition-all duration-300 text-center"
                >
                  <div className="w-16 h-16 bg-gradient-tropical rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-playfair font-semibold mb-3 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

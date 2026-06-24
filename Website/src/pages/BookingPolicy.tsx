import PolicyLayout from "@/components/PolicyLayout";
import { useBrandSettings } from "@/hooks/useBrandSettings";

const BookingPolicy = () => {
  const { settings, loading } = useBrandSettings();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <PolicyLayout title="Booking Policy" lastUpdated="January 2025">
      {settings?.policy_booking ? (
         <div 
           className="prose prose-emerald prose-headings:font-playfair max-w-none text-foreground/80"
           dangerouslySetInnerHTML={{ __html: settings.policy_booking }}
         />
      ) : (
         <p className="text-muted-foreground">Currently, no specific booking policy is configured for this brand.</p>
      )}
    </PolicyLayout>
  );
};

export default BookingPolicy;

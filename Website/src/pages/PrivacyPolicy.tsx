import PolicyLayout from "@/components/PolicyLayout";
import { useBrandSettings } from "@/hooks/useBrandSettings";

const PrivacyPolicy = () => {
  const { settings, loading } = useBrandSettings();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <PolicyLayout title="Privacy Policy" lastUpdated="January 2025">
      {settings?.policy_privacy ? (
         <div 
           className="prose prose-emerald prose-headings:font-playfair max-w-none text-foreground/80"
           dangerouslySetInnerHTML={{ __html: settings.policy_privacy }}
         />
      ) : (
         <p className="text-muted-foreground">Currently, no specific privacy policy is configured for this brand.</p>
      )}
    </PolicyLayout>
  );
};

export default PrivacyPolicy;

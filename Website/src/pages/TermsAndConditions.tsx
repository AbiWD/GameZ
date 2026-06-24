import PolicyLayout from "@/components/PolicyLayout";
import { useBrandSettings } from "@/hooks/useBrandSettings";

const TermsAndConditions = () => {
  const { settings, loading } = useBrandSettings();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <PolicyLayout title="Terms and Conditions" lastUpdated="January 2025">
      {settings?.policy_terms ? (
         <div 
           className="prose prose-emerald prose-headings:font-playfair max-w-none text-foreground/80"
           dangerouslySetInnerHTML={{ __html: settings.policy_terms }}
         />
      ) : (
         <p className="text-muted-foreground">Currently, no specific terms and conditions are configured for this brand.</p>
      )}
    </PolicyLayout>
  );
};

export default TermsAndConditions;

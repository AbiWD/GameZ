import PolicyLayout from "@/components/PolicyLayout";
import { useBrandSettings } from "@/hooks/useBrandSettings";

const RefundPolicy = () => {
  const { settings, loading } = useBrandSettings();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <PolicyLayout title="Refund Policy" lastUpdated="January 2025">
      {settings?.policy_refund ? (
         <div 
           className="prose prose-emerald prose-headings:font-playfair max-w-none text-foreground/80 policy-content"
           dangerouslySetInnerHTML={{ __html: settings.policy_refund }}
         />
      ) : (
         <p className="text-muted-foreground">Currently, no specific refund policy is configured for this brand.</p>
      )}
    </PolicyLayout>
  );
};

export default RefundPolicy;

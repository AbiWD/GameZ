import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import { RecordModel } from 'pocketbase';

export interface WebsiteContent extends RecordModel {
  hero_headline?: string;
  hero_subheadline?: string;
  hero_video?: string;
  hero_highlights?: Array<{ icon: string; text: string }>;
  about_title?: string;
  about_subtitle?: string;
  about_description?: string;
  about_features?: Array<{ icon: string; title: string, description: string }>;
  rooms_title?: string;
  rooms_subtitle?: string;
  experiences_title?: string;
  experiences_subtitle?: string;
  experiences_features?: Array<string>;
  location_title?: string;
  location_map_title?: string;
  location_footer_text?: string;
  getting_here?: Array<{ icon: string; title: string; description: string }>;
  getting_around?: Array<string>;
  nearby_attractions?: Array<{ name: string; distance: string; time: string }>;
  property_address?: string;
  google_maps_url?: string;
  contact_email?: string;
  contact_phone?: string;
  social_facebook?: string;
  social_instagram?: string;
  footer_description?: string;
  proprietor_name?: string;
  policy_terms?: string;
  policy_privacy?: string;
  policy_refund?: string;
  policy_booking?: string;
}

export function useWebsiteContent(propertyId?: string) {
  const [content, setContent] = useState<WebsiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchContent() {
      if (!propertyId) {
        setContent(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const records = await pb.collection('website_content').getFullList({
          filter: `property_id = "${propertyId}"`
        });
        if (records.length > 0) {
          setContent(records[0] as WebsiteContent);
        } else {
          setContent(null);
        }
      } catch (err: any) {
        console.error('Failed to fetch website content:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [propertyId]);

  return { content, loading, error };
}

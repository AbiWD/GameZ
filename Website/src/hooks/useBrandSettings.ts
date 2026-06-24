import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import { RecordModel } from 'pocketbase';

export interface BrandSettings extends RecordModel {
  brand_name?: string;
  logo_image?: string;
  footer_description?: string;
  social_facebook?: string;
  social_instagram?: string;
  policy_terms?: string;
  policy_privacy?: string;
  policy_refund?: string;
  policy_booking?: string;
  about_title?: string;
  about_subtitle?: string;
  about_description?: string;
  about_features?: any;
}

export function useBrandSettings() {
  const [settings, setSettings] = useState<BrandSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchBrandSettings() {
      try {
        const records = await pb.collection('brand_settings').getFullList();
        if (records.length > 0) {
          setSettings(records[0] as BrandSettings);
        } else {
          setSettings(null);
        }
      } catch (err: any) {
        console.error('Failed to fetch brand settings:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchBrandSettings();
  }, []);

  return { settings, loading, error };
}

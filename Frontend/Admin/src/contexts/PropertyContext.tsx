import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import pb from '@/lib/pocketbase';

interface Property {
  id: string;
  name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
}

interface PropertyContextType {
  properties: Property[];
  activeProperty: Property | null;
  setActivePropertyById: (id: string) => void;
  loading: boolean;
  refreshProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProperties = async () => {
    try {
      const records = await pb.collection('properties').getFullList({
        filter: 'is_active = true',
        sort: 'created',
        requestKey: 'global_context_properties'
      });
      const props = records as unknown as Property[];
      setProperties(props);
      
      if (props.length === 0) {
         console.warn("DEV_ALERT: getFullList returned 0 properties! Database might be empty or filter rejected.");
      }

      // Auto-select first if none selected, or keep current if valid
      if (props.length > 0) {
        setActiveProperty(prev => {
          if (!prev || !props.find(p => p.id === prev.id)) {
            return props[0];
          }
          return prev;
        });
      } else {
        setActiveProperty(null);
      }
    } catch (error: any) {
      if (!error.isAbort) {
        console.error("Failed to load properties:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ALWAYS fetch unconditionally on mount to prevent auth-hydration race conditions
    refreshProperties();
    
    // Subscribe to realtime database changes for extreme multi-device sync
    const subscribeProperties = async () => {
      await pb.collection('properties').subscribe('*', function () {
        refreshProperties();
      });
    };
    subscribeProperties();
    
    // Listen for auth changes to re-fetch or clear
    const unsubscribeAuth = pb.authStore.onChange((token, model) => {
      if (model) {
        refreshProperties();
      } else {
        setProperties([]);
        setActiveProperty(null);
      }
    });
    
    return () => {
      pb.collection('properties').unsubscribe('*');
      unsubscribeAuth();
    };
  }, []);

  const setActivePropertyById = (id: string) => {
    const prop = properties.find(p => p.id === id);
    if (prop) setActiveProperty(prop);
  };

  return (
    <PropertyContext.Provider value={{ properties, activeProperty, setActivePropertyById, loading, refreshProperties }}>
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};

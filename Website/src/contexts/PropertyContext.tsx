import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { pb } from '@/lib/pocketbase';
import { useLocation } from 'react-router-dom';

export interface Property {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
  slug?: string;
}

interface PropertyContextType {
  properties: Property[];
  activeProperty: Property | null;
  loading: boolean;
  refreshProperties: () => Promise<void>;
  setActiveProperty: (property: Property | null) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: React.ReactNode }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProperties = async () => {
      const records = await pb.collection('properties').getFullList({
        sort: 'created',
        filter: 'is_active = true'
      });
      const parsedRecords = records as unknown as Property[];
      setProperties(parsedRecords);
      
      if (parsedRecords.length > 0) {
        setActiveProperty(prev => {
          if (!prev || !parsedRecords.find(p => p.id === prev.id)) return parsedRecords[0];
          return prev;
        });
      } else {
        setActiveProperty(null);
      }
    } catch (error: any) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();

    // Subscribe to realtime changes in properties
    pb.collection('properties').subscribe('*', function () {
      fetchProperties();
    });

    return () => {
      pb.collection('properties').unsubscribe('*');
    };
  }, []);



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f8f8]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <PropertyContext.Provider value={{ properties, activeProperty, loading, refreshProperties: fetchProperties, setActiveProperty }}>
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

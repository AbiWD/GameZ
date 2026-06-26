import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import pb from '@/lib/pocketbase';
import * as LucideIcons from 'lucide-react';
import { Loader2, Plus, Trash2, Save, Image as ImageIcon, LayoutTemplate, Sparkles, Settings2, Edit, MapPin, Globe, MessageSquare, Phone, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProperty } from '@/contexts/PropertyContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Facility {
  id: string;
  title: string;
  description: string;
  icon: string;
  image: string;
}

interface Experience {
  id: string;
  title: string;
  description: string;
  icon: string;
  image: string;
}

interface GalleryImage {
  id: string;
  title: string;
  image: string;
}

const AutoResizingTextarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Add roughly 2px for border buffer if needed, but scrollHeight usually handles it
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  // Trigger resize when the value physically changes (e.g. state loaded from DB)
  useEffect(() => {
    resize();
  }, [props.value]);

  // Trigger resize if the component becomes visible (swapping React Tabs from display:none)
  useEffect(() => {
    if (!textareaRef.current) return;
    const ro = new ResizeObserver(() => {
      // Small timeout guarantees layout engine finished painting
      window.requestAnimationFrame(() => resize());
    });
    ro.observe(textareaRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      className={`flex min-h-[40px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden ${className || ''}`}
      rows={1}
      onInput={(e) => {
        resize();
        if (props.onInput) props.onInput(e);
      }}
    />
  );
};

export default function WebsiteContent() {
  const { toast } = useToast();
  const { activeProperty, properties } = useProperty();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [savingGallery, setSavingGallery] = useState(false);
  const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null);

  // --- REVIEWS STATE ---
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsTotalItems, setReviewsTotalItems] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({
    guest_name: '',
    review_text: '',
    property_id: ''
  });

  // Hero Section State
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroSubheadline, setHeroSubheadline] = useState('');
  const [heroVideoFile, setHeroVideoFile] = useState<File | null>(null);
  const [heroVideoPreview, setHeroVideoPreview] = useState<string>('');
  
  const [heroHighlights, setHeroHighlights] = useState([
    { icon: 'Leaf', text: 'Tropical Surroundings' },
  ]);



  // Rooms Section State
  const [roomsTitle, setRoomsTitle] = useState('');
  const [roomsSubtitle, setRoomsSubtitle] = useState('');

  // Experiences Global State
  const [experiencesTitle, setExperiencesTitle] = useState('');
  const [experiencesSubtitle, setExperiencesSubtitle] = useState('');
  const [experiencesFeatures, setExperiencesFeatures] = useState([
    'Nature walks in coconut groves', 'Bird watching opportunities'
  ]);

  // Location & Contact Global State
  const [locationTitle, setLocationTitle] = useState('');
  const [locationMapTitle, setLocationMapTitle] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  
  // Footer & Contact State
  const [footerDescription, setFooterDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [proprietorName, setProprietorName] = useState('');

  const [gettingHere, setGettingHere] = useState([
    { icon: 'Car', title: 'By Road', description: 'Around 55 km from Mangalore city center...' }
  ]);
  const [gettingAround, setGettingAround] = useState(['Local taxis and auto-rickshaws available']);
  const [nearbyAttractions, setNearbyAttractions] = useState([
    { name: 'Gadaikallu', distance: '10 km', time: '20 mins' }
  ]);

  // --- FACILITIES STATE ---
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  
  const [facilityFormData, setFacilityFormData] = useState({
    title: '',
    description: '',
    icon: 'Star',
    imageFile: null as File | null,
    imagePreview: ''
  });

  // --- EXPERIENCES STATE ---
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(false);
  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  
  const [experienceFormData, setExperienceFormData] = useState({
    title: '',
    description: '',
    icon: 'Footprints',
    imageFile: null as File | null,
    imagePreview: ''
  });

  // --- GALLERY STATE ---
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  
  const [galleryFormData, setGalleryFormData] = useState({
    title: '',
    imageFile: null as File | null,
    imagePreview: ''
  });

  const AVAILABLE_ICONS = [
    'Anchor', 'Aperture', 'Bath', 'Bed', 'BedDouble', 'Bike', 'Binoculars', 'Briefcase', 'Brush', 'BusFront',
    'CalendarDays', 'Camera', 'Car', 'CarTaxiFront', 'Cctv', 'ChefHat', 'CigaretteOff', 'Clock', 'Coffee', 'Compass', 'ConciergeBell', 'Croissant',
    'DoorOpen', 'Droplet', 'Dumbbell', 'Eye', 'Fan', 'FireExtinguisher', 'Fish', 'Flame', 'FlameKindling', 'Flower2', 'Footprints',
    'Gamepad2', 'GlassWater', 'Heart', 'Home', 'Image', 'Key', 'Leaf', 'LifeBuoy', 'Luggage',
    'Mail', 'Map', 'MapPin', 'Maximize', 'Monitor', 'Mountain', 'MountainSnow', 'Music',
    'PaintBucket', 'Palette', 'Palmtree', 'ParkingCircle', 'PartyPopper', 'Phone', 'Plane', 'Refrigerator',
    'Sailboat', 'Send', 'ShieldCheck', 'Shirt', 'Ship', 'Snowflake', 'Soup', 'Sparkles', 'Sprout', 'Star', 'Sun', 'Sunrise',
    'Tent', 'ThermometerSun', 'Ticket', 'Tractor', 'TrainFront', 'TreePalm', 'TreePine', 'Trees', 'Tv',
    'Umbrella', 'Users', 'Utensils', 'Wallet', 'WashingMachine', 'Waves', 'Wheat', 'Wifi', 'Wind', 'Wine'
  ];



  useEffect(() => {
    if (activeProperty) {
      fetchContent();
      fetchFacilities();
      fetchExperiences();
      fetchGallery();
      // Reset review page when property changes
      setReviewsPage(1);
    }
  }, [activeProperty]);

  useEffect(() => {
    if (activeProperty) {
      fetchReviews();
    }
  }, [activeProperty, reviewsPage]);

  const fetchContent = async () => {
    if (!activeProperty?.id) return;
    setLoading(true);
    try {
      const records = await pb.collection('website_content').getFullList({
        filter: `property_id = "${activeProperty.id}"`
      });
      if (records.length > 0) {
        const record = records[0];
        setRecordId(record.id);
        
        setHeroHeadline(record.hero_headline || '');
        setHeroSubheadline(record.hero_subheadline || '');
        if (record.hero_video) setHeroVideoPreview(pb.files.getUrl(record, record.hero_video));
        if (record.hero_highlights && Array.isArray(record.hero_highlights)) setHeroHighlights(record.hero_highlights);



        setRoomsTitle(record.rooms_title || '');
        setRoomsSubtitle(record.rooms_subtitle || '');

        setExperiencesTitle(record.experiences_title || '');
        setExperiencesSubtitle(record.experiences_subtitle || '');
        if (record.experiences_features && Array.isArray(record.experiences_features)) {
          setExperiencesFeatures(record.experiences_features);
        }

        setLocationTitle(record.location_title || '');
        setLocationMapTitle(record.location_map_title || '');
        setPropertyAddress(record.property_address || '');
        setGoogleMapsUrl(record.google_maps_url || '');
        
        setFooterDescription(record.footer_description || '');
        setContactEmail(record.contact_email || '');
        setContactPhone(record.contact_phone || '');
        setProprietorName(record.proprietor_name || '');

        if (record.getting_here && Array.isArray(record.getting_here)) setGettingHere(record.getting_here);
        if (record.getting_around && Array.isArray(record.getting_around)) setGettingAround(record.getting_around);
        if (record.nearby_attractions && Array.isArray(record.nearby_attractions)) setNearbyAttractions(record.nearby_attractions);
      } else {
        // Reset everything if this resort has NO content yet, so it saves as blank and relies on frontend fallbacks
        setRecordId(null);
        setHeroHeadline('');
        setHeroSubheadline('');
        setHeroVideoFile(null);
        setHeroVideoPreview('');
        setHeroHighlights([]);

        setRoomsTitle('');
        setRoomsSubtitle('');
        setExperiencesTitle('');
        setExperiencesSubtitle('');
        setExperiencesFeatures([]);
        setLocationTitle('');
        setLocationMapTitle('');
        setPropertyAddress('');
        setGoogleMapsUrl('');
        setFooterDescription('');
        setContactEmail('');
        setContactPhone('');
        setProprietorName('');
        setGettingHere([]);
        setGettingAround([]);
        setNearbyAttractions([]);
      }
    } catch (error) {
      console.error('Error fetching website content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    setLoadingFacilities(true);
    try {
      const data = await pb.collection('facilities').getFullList({
        filter: `property_id = "${activeProperty?.id}"`,
        sort: '-created'
      });
      setFacilities(data as unknown as Facility[]);
    } catch(err) {
      console.error("Failed to fetch facilities", err);
    } finally {
      setLoadingFacilities(false);
    }
  }

  const fetchExperiences = async () => {
    setLoadingExperiences(true);
    try {
      const data = await pb.collection('experiences').getFullList({
        filter: `property_id = "${activeProperty?.id}"`,
        sort: '-created'
      });
      setExperiences(data as unknown as Experience[]);
    } catch(err) {
      console.error("Failed to fetch experiences", err);
    } finally {
      setLoadingExperiences(false);
    }
  }

  const fetchGallery = async () => {
    setLoadingGallery(true);
    try {
      const data = await pb.collection('gallery').getFullList({
        filter: `property_id = "${activeProperty?.id}"`,
        sort: '-created'
      });
      setGallery(data as unknown as GalleryImage[]);
    } catch(err) {
      console.error("Failed to fetch gallery", err);
    } finally {
      setLoadingGallery(false);
    }
  };

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const records = await pb.collection('reviews').getList(reviewsPage, 10, {
        sort: '-created',
        expand: 'property_id'
      });
      setReviews(records.items);
      setReviewsTotalPages(records.totalPages);
      setReviewsTotalItems(records.totalItems);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({ title: 'Error', description: 'Failed to load reviews.', variant: 'destructive' });
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSaveContent = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      
      formData.append('hero_headline', heroHeadline);
      formData.append('hero_subheadline', heroSubheadline);
      formData.append('hero_highlights', JSON.stringify(heroHighlights));
      if (heroVideoFile) formData.append('hero_video', heroVideoFile);



      formData.append('rooms_title', roomsTitle);
      formData.append('rooms_subtitle', roomsSubtitle);

      formData.append('experiences_title', experiencesTitle);
      formData.append('experiences_subtitle', experiencesSubtitle);
      formData.append('experiences_features', JSON.stringify(experiencesFeatures));

      formData.append('location_title', locationTitle);
      // formData.append('location_map_title', locationMapTitle); // UNCOMMENT when this field is added to Pocketbase
      formData.append('property_address', propertyAddress);
      formData.append('google_maps_url', googleMapsUrl);
      
      formData.append('footer_description', footerDescription);
      formData.append('contact_email', contactEmail);
      formData.append('contact_phone', contactPhone);
      formData.append('proprietor_name', proprietorName);

      formData.append('getting_here', JSON.stringify(gettingHere));
      formData.append('getting_around', JSON.stringify(gettingAround));
      formData.append('nearby_attractions', JSON.stringify(nearbyAttractions));

      if (activeProperty?.id) {
        formData.append('property_id', activeProperty.id);
      }

      let updatedRecord;
      if (recordId) {
        updatedRecord = await pb.collection('website_content').update(recordId, formData);
      } else {
        updatedRecord = await pb.collection('website_content').create(formData);
        setRecordId(updatedRecord.id);
      }

      if (updatedRecord.hero_video) setHeroVideoPreview(pb.files.getUrl(updatedRecord, updatedRecord.hero_video));
      setHeroVideoFile(null);

      toast({ title: 'Success', description: 'Website content saved successfully!' });
    } catch (error: any) {
      console.error('Error saving website content:', error);
      if (error?.response?.data) {
        console.error('Validation Error Details:', JSON.stringify(error.response.data, null, 2));
        alert('PocketBase Validation Failed:\n\n' + JSON.stringify(error.response.data, null, 2));
      } else {
        alert('Error: ' + error.message);
      }
      toast({ title: 'Update Failed', description: 'Check console for errors', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // --- FACILITIES HANDLERS ---
  const handleFacilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', facilityFormData.title);
      fd.append('description', facilityFormData.description);
      fd.append('icon', facilityFormData.icon);
      if (facilityFormData.imageFile) {
        fd.append('image', facilityFormData.imageFile);
      }

      if (editingFacility) {
        await pb.collection('facilities').update(editingFacility.id, fd);
        toast({ title: 'Success', description: 'Facility updated' });
      } else {
        fd.append('property_id', activeProperty?.id as string);
        await pb.collection('facilities').create(fd);
        toast({ title: 'Success', description: 'Facility created' });
      }
      
      setFacilityDialogOpen(false);
      fetchFacilities();
    } catch (err: any) {
      console.error(err);
      let errorDetails = err?.message || 'Failed to save facility.';
      if (err?.data?.data) {
        const fieldErrors = Object.entries(err.data.data)
          .map(([field, e]: [string, any]) => `${field}: ${e.message}`)
          .join(', ');
        if (fieldErrors) errorDetails = `Invalid fields -> ${fieldErrors}`;
      }
      toast({ title: 'Error', description: errorDetails, variant: 'destructive'});
    }
  }

  const handleDeleteFacility = async (id: string) => {
    try {
      await pb.collection('facilities').delete(id);
      toast({ title: 'Success', description: 'Facility deleted' });
      fetchFacilities();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to delete facility', variant: 'destructive'});
    }
  }

  const resetFacilityForm = () => {
    setEditingFacility(null);
    setFacilityFormData({ title: '', description: '', icon: 'Star', imageFile: null, imagePreview: '' });
  }

  const openFacilityEdit = (fac: Facility) => {
    setEditingFacility(fac);
    setFacilityFormData({
      title: fac.title,
      description: fac.description,
      icon: fac.icon || 'Star',
      imageFile: null,
      imagePreview: fac.image ? pb.files.getUrl(fac as any, fac.image) : ''
    });
    setFacilityDialogOpen(true);
  }

  // --- EXPERIENCES HANDLERS ---
  const handleExperienceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', experienceFormData.title);
      fd.append('description', experienceFormData.description);
      fd.append('icon', experienceFormData.icon);
      if (experienceFormData.imageFile) {
        fd.append('image', experienceFormData.imageFile);
      }

      if (editingExperience) {
        await pb.collection('experiences').update(editingExperience.id, fd);
        toast({ title: 'Success', description: 'Experience updated' });
      } else {
        fd.append('property_id', activeProperty?.id as string);
        await pb.collection('experiences').create(fd);
        toast({ title: 'Success', description: 'Experience created' });
      }
      
      setExperienceDialogOpen(false);
      fetchExperiences();
    } catch (err: any) {
      console.error(err);
      let errorDetails = err?.message || 'Failed to save experience.';
      if (err?.data?.data) {
        const fieldErrors = Object.entries(err.data.data)
          .map(([field, e]: [string, any]) => `${field}: ${e.message}`)
          .join(', ');
        if (fieldErrors) errorDetails = `Invalid fields -> ${fieldErrors}`;
      }
      toast({ title: 'Error', description: errorDetails, variant: 'destructive'});
    }
  }

  const handleDeleteExperience = async (id: string) => {
    try {
      await pb.collection('experiences').delete(id);
      toast({ title: 'Success', description: 'Experience deleted' });
      fetchExperiences();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to delete experience', variant: 'destructive'});
    }
  }

  const resetExperienceForm = () => {
    setEditingExperience(null);
    setExperienceFormData({ title: '', description: '', icon: 'Footprints', imageFile: null, imagePreview: '' });
  }

  const openExperienceEdit = (exp: Experience) => {
    setEditingExperience(exp);
    setExperienceFormData({
      title: exp.title,
      description: exp.description,
      icon: exp.icon || 'Footprints',
      imageFile: null,
      imagePreview: exp.image ? pb.files.getUrl(exp as any, exp.image) : ''
    });
    setExperienceDialogOpen(true);
  }

  // --- GALLERY HANDLERS ---
  const handleGallerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryFormData.imageFile) {
      toast({ title: 'Error', description: 'Please select an image to upload.', variant: 'destructive'});
      return;
    }
    try {
      const fd = new FormData();
      fd.append('title', galleryFormData.title);
      fd.append('image', galleryFormData.imageFile);
      fd.append('property_id', activeProperty?.id as string);

      await pb.collection('gallery').create(fd);
      toast({ title: 'Success', description: 'Photo added to gallery' });
      setGalleryDialogOpen(false);
      setGalleryFormData({ title: '', imageFile: null, imagePreview: '' });
      fetchGallery();
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to upload photo', variant: 'destructive'});
    }
  }

  const handleDeleteGallery = async (id: string) => {
    setDeletingGalleryId(id);
    try {
      await pb.collection('gallery').delete(id);
      setGallery(gallery.filter((item) => item.id !== id));
      toast({ title: 'Success', description: 'Photo removed.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove photo.', variant: 'destructive' });
    } finally {
      setDeletingGalleryId(null);
    }
  };

  // --- REVIEWS HANDLERS ---
  const handleOpenReviewDialog = (review?: any) => {
    if (review) {
      setEditingReview(review);
      setReviewForm({
        guest_name: review.guest_name || '',
        review_text: review.review_text || '',
        property_id: review.property_id || ''
      });
    } else {
      setEditingReview(null);
      setReviewForm({
        guest_name: '',
        review_text: '',
        property_id: properties.length > 0 ? properties[0].id : ''
      });
    }
    setIsReviewDialogOpen(true);
  };

  const handleSaveReview = async () => {
    try {
      if (!reviewForm.guest_name || !reviewForm.review_text || !reviewForm.property_id) {
         toast({ title: 'Missing fields', description: 'Please fill name, text, and select a property.', variant: 'destructive' });
         return;
      }

      setSaving(true);
      if (editingReview) {
        await pb.collection('reviews').update(editingReview.id, reviewForm);
        toast({ title: 'Success', description: 'Review updated successfully.' });
      } else {
        await pb.collection('reviews').create(reviewForm);
        toast({ title: 'Success', description: 'Review added successfully.' });
      }
      setIsReviewDialogOpen(false);
      fetchReviews();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Could not save review.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await pb.collection('reviews').delete(id);
      fetchReviews();
      toast({ title: 'Success', description: 'Review deleted.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete review.', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Website Content</h1>
            <p className="text-muted-foreground mt-1">Manage the dynamic content on your public website.</p>
          </div>
        </div>

        <Tabs defaultValue="global" className="w-full space-y-6">
          <TabsList className="bg-secondary/50 border border-border flex w-[calc(100%+2rem)] -mx-4 sm:w-full sm:mx-0 px-8 sm:px-4 md:px-1 overflow-x-auto whitespace-nowrap scrollbar-hide justify-start md:justify-center h-auto gap-3 snap-x snap-mandatory md:snap-none scroll-smooth touch-pan-x rounded-2xl p-1">
            <TabsTrigger 
              value="global" 
              onClick={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
              className="snap-center shrink-0 transition-transform duration-300 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground rounded-xl py-2 px-4"
            >
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Main Page Sections
            </TabsTrigger>
            <TabsTrigger 
              value="facilities" 
              onClick={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
               className="snap-center shrink-0 transition-transform duration-300 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground rounded-xl py-2 px-4"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Resort Facilities
            </TabsTrigger>
            <TabsTrigger 
              value="experiences" 
              onClick={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
               className="snap-center shrink-0 transition-transform duration-300 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground rounded-xl py-2 px-4"
            >
              <LucideIcons.Camera className="w-4 h-4 mr-2" />
              Experiences
            </TabsTrigger>
            <TabsTrigger 
              value="gallery" 
              onClick={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
               className="snap-center shrink-0 transition-transform duration-300 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground rounded-xl py-2 px-4"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Gallery
            </TabsTrigger>
            <TabsTrigger 
              value="location" 
              onClick={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
               className="snap-center shrink-0 transition-transform duration-300 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground rounded-xl py-2 px-4"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Location
            </TabsTrigger>
            <TabsTrigger 
              value="reviews" 
              onClick={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
               className="snap-center shrink-0 transition-transform duration-300 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground rounded-xl py-2 px-4"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger 
              value="footer" 
              onClick={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
               className="snap-center shrink-0 transition-transform duration-300 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground rounded-xl py-2 px-4"
            >
              <Phone className="w-4 h-4 mr-2" />
              Footer & Contact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="outline-none space-y-8 animate-in fade-in duration-500 fill-mode-forwards">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-8">
                {/* HERO SECTION CARD */}
                <Card className="rounded-3xl border border-border shadow-sm bg-card">
                  <CardHeader>
                    <CardTitle className="text-2xl">Hero Section</CardTitle>
                    <CardDescription>The main landing section of your website.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="heroHeadline">Headline</Label>
                        <AutoResizingTextarea id="heroHeadline" value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} placeholder="e.g. A Peaceful Tropical Escape" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="heroSubheadline">Subheadline</Label>
                        <AutoResizingTextarea id="heroSubheadline" value={heroSubheadline} onChange={(e) => setHeroSubheadline(e.target.value)} placeholder="e.g. Experience village life..." />
                      </div>
                    </div>
                    <div className="grid gap-4 bg-muted/30 p-4 rounded-xl">
                      <Label>Background Video / Image</Label>
                      <div className="flex items-center gap-4">
                        {heroVideoPreview && !heroVideoFile ? (
                          <div className="relative w-40 h-24 bg-black rounded-md overflow-hidden flex-shrink-0">
                            {heroVideoPreview.match(/\.(mp4|webm)$/i) ? <video src={heroVideoPreview} className="w-full h-full object-cover" muted /> : <img src={heroVideoPreview} alt="Hero" className="w-full h-full object-cover" />}
                          </div>
                        ) : (
                          <div className="w-40 h-24 bg-muted border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground flex-shrink-0">
                            <ImageIcon className="h-6 w-6 mb-1" />
                            <span className="text-xs">No media</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <Input type="file" accept="video/mp4,video/webm,image/*" onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) setHeroVideoFile(e.target.files[0]);
                          }} />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label>Highlights (Icon Features)</Label>
                        <Button variant="outline" size="sm" onClick={() => setHeroHighlights([...heroHighlights, { icon: 'Leaf', text: '' }])}>
                          <Plus className="h-4 w-4 mr-1" /> Add Highlight
                        </Button>
                      </div>
                      {heroHighlights.map((highlight, index) => {
                        const SelectedIcon = (LucideIcons as any)[highlight.icon] || LucideIcons.Leaf;
                        return (
                          <div key={index} className="flex flex-col sm:flex-row gap-4 sm:items-end bg-muted/10 p-4 rounded-xl border border-border">
                            <div className="grid gap-2 w-full sm:w-48 shrink-0">
                              <Label className="text-xs font-semibold text-muted-foreground">Select Icon</Label>
                              <Select value={highlight.icon} onValueChange={(val) => {
                                const nw = [...heroHighlights]; nw[index].icon = val; setHeroHighlights(nw);
                              }}>
                                <SelectTrigger className="bg-secondary border-border">
                                  <SelectValue><div className="flex items-center gap-2"><SelectedIcon className="w-4 h-4 text-primary" /><span className="truncate">{highlight.icon}</span></div></SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {AVAILABLE_ICONS.map(i => { const Ig = (LucideIcons as any)[i]; return <SelectItem key={i} value={i}><div className="flex items-center gap-2"><Ig className="w-4 h-4 text-muted-foreground mr-1" />{i}</div></SelectItem> })}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2 flex-1">
                              <Label className="text-xs font-semibold text-muted-foreground">Display Text</Label>
                              <AutoResizingTextarea value={highlight.text} onChange={(e) => { const nw = [...heroHighlights]; nw[index].text = e.target.value; setHeroHighlights(nw); }} className="bg-secondary border-border" />
                            </div>
                            <Button variant="ghost" size="icon" className="self-end sm:self-auto mb-[2px] text-destructive hover:bg-destructive/10 shrink-0" onClick={() => setHeroHighlights(heroHighlights.filter((_, i) => i !== index))}><Trash2 className="h-5 w-5" /></Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>



                {/* ROOMS HEADERS */}
                <Card className="rounded-3xl border border-border shadow-sm bg-card">
                  <CardHeader>
                    <CardTitle className="text-2xl">Rooms Section (Headers)</CardTitle>
                    <CardDescription>Set the title and subtitle for the rooms area.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 px-5 py-4 rounded-xl flex gap-3 text-sm items-start shadow-sm dark:text-amber-400">
                      <LucideIcons.AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="font-bold block mb-1">Configuration Note</span>
                        The actual station types, cards, pricing, and images are configured separately in the <strong>Rooms</strong> tab on the main sidebar. The fields below only change the introduction text shown above the stations list.
                      </div>
                    </div>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="roomsTitle">Main Title</Label>
                        <AutoResizingTextarea id="roomsTitle" value={roomsTitle} onChange={(e) => setRoomsTitle(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="roomsSubtitle">Subtitle</Label>
                        <AutoResizingTextarea id="roomsSubtitle" value={roomsSubtitle} onChange={(e) => setRoomsSubtitle(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* EXPERIENCES HEADERS MOVED TO EXPERIENCES TAB */}

                <div className="pt-4 flex justify-end pb-8">
                  <Button onClick={handleSaveContent} disabled={saving} className="rounded-full px-8">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Global Content
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* LOCATION TAB */}
          <TabsContent value="location" className="outline-none space-y-6 animate-in fade-in duration-500 fill-mode-forwards">
             <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 lg:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Location & Attractions</h2>
                    <p className="text-sm text-muted-foreground mt-1">Set how guests can reach you and what is nearby.</p>
                  </div>
                </div>
                
                <Card className="rounded-3xl border-none shadow-none bg-transparent">
                  <CardContent className="space-y-6 p-0">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Main Section Title</Label>
                        <AutoResizingTextarea value={locationTitle} onChange={(e) => setLocationTitle(e.target.value)} placeholder="e.g. Find Your Way to Paradise" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Map Pin Title</Label>
                          <AutoResizingTextarea value={locationMapTitle} onChange={(e) => setLocationMapTitle(e.target.value)} placeholder="e.g. GameZ Someshwar" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Property Full Address</Label>
                          <Input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Google Maps Link</Label>
                        <Input value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.app.goo.gl/..." />
                      </div>
                    </div>

                    <div className="grid gap-4 mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <Label>Getting Here (Transport Options)</Label>
                        <Button variant="outline" size="sm" onClick={() => setGettingHere([...gettingHere, { icon: 'Car', title: '', description: '' }])}>
                          <Plus className="h-4 w-4 mr-1" /> Add Option
                        </Button>
                      </div>
                      {gettingHere.map((item, index) => {
                        const SelectedIcon = (LucideIcons as any)[item.icon] || LucideIcons.Car;
                        return (
                          <div key={`gh-${index}`} className="flex flex-col sm:flex-row gap-4 sm:items-start bg-muted/10 p-4 rounded-xl border border-border">
                            <div className="grid gap-2 w-full sm:w-48 shrink-0">
                              <Label className="text-xs text-muted-foreground">Select Icon</Label>
                              <Select value={item.icon} onValueChange={(val) => { const nw = [...gettingHere]; nw[index].icon = val; setGettingHere(nw); }}>
                                <SelectTrigger className="bg-secondary border-border"><SelectValue><div className="flex items-center gap-2"><SelectedIcon className="w-4 h-4 text-primary" /><span className="truncate">{item.icon}</span></div></SelectValue></SelectTrigger>
                                <SelectContent className="max-h-[200px]">{AVAILABLE_ICONS.map(i => { const Ig = (LucideIcons as any)[i]; return <SelectItem key={i} value={i}><div className="flex items-center gap-2"><Ig className="w-4 h-4 mr-1"/>{i}</div></SelectItem> })}</SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-3 flex-1">
                              <div className="grid gap-2"><Label className="text-xs text-muted-foreground">Title</Label><AutoResizingTextarea value={item.title} onChange={(e) => { const nw = [...gettingHere]; nw[index].title = e.target.value; setGettingHere(nw); }} className="bg-secondary border-border" /></div>
                              <div className="grid gap-2"><Label className="text-xs text-muted-foreground">Description</Label><AutoResizingTextarea value={item.description} onChange={(e) => { const nw = [...gettingHere]; nw[index].description = e.target.value; setGettingHere(nw); }} className="bg-secondary border-border" /></div>
                            </div>
                            <Button variant="ghost" size="icon" className="self-end sm:self-auto text-destructive sm:mt-[26px]" onClick={() => setGettingHere(gettingHere.filter((_, i) => i !== index))}><Trash2 className="h-5 w-5" /></Button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid gap-4 mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <Label>Getting Around (Bullet Points)</Label>
                        <Button variant="outline" size="sm" onClick={() => setGettingAround([...gettingAround, ''])}>
                          <Plus className="h-4 w-4 mr-1" /> Add Point
                        </Button>
                      </div>
                      {gettingAround.map((item, index) => (
                        <div key={`ga-${index}`} className="flex gap-4 items-center bg-muted/10 p-2 rounded-xl border border-border">
                           <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 ml-3" />
                           <AutoResizingTextarea value={item} onChange={(e) => { const nw = [...gettingAround]; nw[index] = e.target.value; setGettingAround(nw); }} className="bg-secondary border-border flex-1" />
                           <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setGettingAround(gettingAround.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 mt-6">
                      <div className="flex justify-between items-center mb-2">
                        <Label>Nearby Attractions</Label>
                        <Button variant="outline" size="sm" onClick={() => setNearbyAttractions([...nearbyAttractions, { name: '', distance: '', time: '' }])}>
                          <Plus className="h-4 w-4 mr-1" /> Add Attraction
                        </Button>
                      </div>
                      {nearbyAttractions.map((item, index) => (
                        <div key={`na-${index}`} className="flex flex-col sm:flex-row gap-4 sm:items-end bg-muted/10 p-4 rounded-xl border border-border">
                           <div className="grid gap-2 w-full sm:flex-1"><Label className="text-xs text-muted-foreground">Place Name</Label><AutoResizingTextarea value={item.name} onChange={(e) => { const nw = [...nearbyAttractions]; nw[index].name = e.target.value; setNearbyAttractions(nw); }} className="bg-secondary border-border" /></div>
                           <div className="flex gap-4 w-full sm:w-auto">
                             <div className="grid gap-2 flex-1 sm:w-32"><Label className="text-xs text-muted-foreground">Distance</Label><Input value={item.distance} onChange={(e) => { const nw = [...nearbyAttractions]; nw[index].distance = e.target.value; setNearbyAttractions(nw); }} className="bg-secondary border-border" placeholder="e.g. 10 km" /></div>
                             <div className="grid gap-2 flex-1 sm:w-32"><Label className="text-xs text-muted-foreground">Time (Optional)</Label><Input value={item.time} onChange={(e) => { const nw = [...nearbyAttractions]; nw[index].time = e.target.value; setNearbyAttractions(nw); }} className="bg-secondary border-border" placeholder="e.g. 20 mins" /></div>
                           </div>
                           <Button variant="ghost" size="icon" className="self-end sm:self-auto text-destructive sm:mb-0.5" onClick={() => setNearbyAttractions(nearbyAttractions.filter((_, i) => i !== index))}><Trash2 className="h-5 w-5" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-8 flex justify-end">
                  <Button onClick={handleSaveContent} disabled={saving} className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Location Data
                  </Button>
                </div>
             </div>
          </TabsContent>

          {/* FACILITIES TAB */}
          <TabsContent value="facilities" className="outline-none space-y-6 animate-in fade-in duration-500 fill-mode-forwards">
             <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 lg:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Resort Facilities & Amenities</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage extra spaces like Common Areas, Dining, Workspaces</p>
                </div>
                <Dialog open={facilityDialogOpen} onOpenChange={(open) => {
                  setFacilityDialogOpen(open);
                  if (!open) resetFacilityForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl font-semibold px-6">
                      <Plus className="w-4 h-4 mr-2" /> Add Facility
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold tracking-tight text-center">{editingFacility ? 'Edit Facility' : 'Add New Facility'}</DialogTitle>
                      <DialogDescription className="text-center text-muted-foreground pb-4">Add a new feature card below the Rooms section.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFacilitySubmit} className="space-y-4">
                      <label className="cursor-pointer block bg-muted/10 rounded-2xl border-2 border-dashed border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all text-center group overflow-hidden relative">
                          {facilityFormData.imagePreview && !facilityFormData.imageFile ? (
                          <img src={facilityFormData.imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-md" />
                        ) : (
                          <div className="w-full h-40 bg-muted/50 rounded-md flex flex-col items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                            <span className="text-sm">Upload Cover Image</span>
                          </div>
                        )}
                          <input type="file" className="hidden"  accept="image/*" onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setFacilityFormData({...facilityFormData, imageFile: e.target.files[0]});
                          }
                        }}  />
                        </label>

                      <div className="grid gap-2">
                        <Label>Card Title</Label>
                        <AutoResizingTextarea required value={facilityFormData.title} onChange={e => setFacilityFormData({...facilityFormData, title: e.target.value})} placeholder="e.g. Common Spaces" />
                      </div>

                      <div className="grid gap-2">
                        <Label>Short Description</Label>
                        <AutoResizingTextarea 
                          required 
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                          value={facilityFormData.description} 
                          onChange={e => setFacilityFormData({...facilityFormData, description: e.target.value})} 
                          placeholder="e.g. Comfortable living areas for guests..." 
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Icon</Label>
                        <Select value={facilityFormData.icon} onValueChange={(v) => setFacilityFormData({...facilityFormData, icon: v})}>
                          <SelectTrigger>
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {(()=>{ const Ic = (LucideIcons as any)[facilityFormData.icon] || LucideIcons.Star; return <Ic className="w-4 h-4 text-primary" /> })()}
                                {facilityFormData.icon}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {AVAILABLE_ICONS.map(i => { const Ic = (LucideIcons as any)[i]; return <SelectItem key={i} value={i}><div className="flex items-center gap-2"><Ic className="w-4 h-4 mr-1 text-muted-foreground"/>{i}</div></SelectItem> })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-center sm:justify-end gap-3 mt-6">
                        <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => setFacilityDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" className="rounded-full px-6 shadow-md bg-primary hover:bg-primary/90">{editingFacility ? 'Update' : 'Add'} Facility</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {loadingFacilities ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : facilities.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-3xl">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No facilities added yet. Create one to display on the website.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {facilities.map((fac) => {
                    const imageUrl = fac.image ? pb.files.getUrl(fac as any, fac.image) : '';
                    const IconComp = (LucideIcons as any)[fac.icon] || LucideIcons.Star;
                    
                    return (
                      <div key={fac.id} className="group border border-border rounded-2xl overflow-hidden bg-muted/10 hover:shadow-md transition-all">
                        <div className="h-40 relative overflow-hidden bg-muted">
                          {imageUrl ? <img src={imageUrl} alt={fac.title} className="w-full h-full object-cover" /> : <div className="flex w-full h-full items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground/30" /></div>}
                          <div className="absolute top-3 left-3 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center text-primary shadow-sm">
                            <IconComp className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-semibold text-lg mb-1">{fac.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{fac.description}</p>
                          <div className="flex justify-end gap-2 pt-4 border-t border-border">
                            <Button variant="ghost" size="sm" className="h-8 hover:bg-primary/10 hover:text-primary" onClick={() => openFacilityEdit(fac)}>
                              <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Facility?</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete "{fac.title}"? This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteFacility(fac.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* EXPERIENCES TAB */}
          <TabsContent value="experiences" className="outline-none space-y-6 animate-in fade-in duration-500 fill-mode-forwards">
             <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 lg:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Authentic Experiences</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage local tours, cuisine, and activities</p>
                </div>
              </div>

              {/* EXPERIENCES PAGE HEADERS & BULLETS */}
              <Card className="rounded-3xl border-none shadow-none mb-10 bg-transparent">
                <CardContent className="space-y-6 p-0">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Main Title</Label>
                      <AutoResizingTextarea value={experiencesTitle} onChange={(e) => setExperiencesTitle(e.target.value)} placeholder="e.g. Authentic Experiences" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Subtitle</Label>
                      <AutoResizingTextarea value={experiencesSubtitle} onChange={(e) => setExperiencesSubtitle(e.target.value)} placeholder="e.g. Immerse yourself in local culture..." />
                    </div>
                  </div>
                  <div className="grid gap-4 mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <Label>What Else You Can Enjoy (Bullet Points)</Label>
                      <Button variant="outline" size="sm" onClick={() => setExperiencesFeatures([...experiencesFeatures, ''])}>
                        <Plus className="h-4 w-4 mr-1" /> Add Point
                      </Button>
                    </div>
                    {experiencesFeatures.map((item, index) => (
                      <div key={`ef-${index}`} className="flex gap-4 items-center bg-muted/10 p-3 rounded-xl border border-border">
                         <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 ml-1" />
                         <AutoResizingTextarea value={item} onChange={(e) => { const nw = [...experiencesFeatures]; nw[index] = e.target.value; setExperiencesFeatures(nw); }} className="bg-secondary border-border flex-1" />
                         <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => setExperiencesFeatures(experiencesFeatures.filter((_, i) => i !== index))}><Trash2 className="h-5 w-5" /></Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="border-t border-border pt-10 mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Experiences List</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add specific curated experiences shown as cards.</p>
                </div>
                <Dialog open={experienceDialogOpen} onOpenChange={(open) => {
                  setExperienceDialogOpen(open);
                  if (!open) resetExperienceForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="rounded-full bg-primary hover:bg-primary/90 px-6">
                      <Plus className="w-4 h-4 mr-2" /> Add Experience
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-card p-6 rounded-3xl border border-border shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold tracking-tight text-center">{editingExperience ? 'Edit Experience' : 'Add New Experience'}</DialogTitle>
                      <DialogDescription className="text-center text-muted-foreground pb-4">Add a new curated experience for your guests.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleExperienceSubmit} className="space-y-4">
                      <label className="cursor-pointer block bg-muted/10 rounded-2xl border-2 border-dashed border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all text-center group overflow-hidden relative">
                          {experienceFormData.imagePreview && !experienceFormData.imageFile ? (
                          <img src={experienceFormData.imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-md" />
                        ) : (
                          <div className="w-full h-40 bg-muted/50 rounded-md flex flex-col items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                            <span className="text-sm">Optional Image (for featured experiences)</span>
                          </div>
                        )}
                          <input type="file" className="hidden"  accept="image/*" onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setExperienceFormData({...experienceFormData, imageFile: e.target.files[0]});
                          }
                        }}  />
                        </label>

                      <div className="grid gap-2">
                        <Label>Experience Title</Label>
                        <AutoResizingTextarea required value={experienceFormData.title} onChange={e => setExperienceFormData({...experienceFormData, title: e.target.value})} placeholder="e.g. Village Tours" />
                      </div>

                      <div className="grid gap-2">
                        <Label>Short Description</Label>
                        <AutoResizingTextarea 
                          required 
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                          value={experienceFormData.description} 
                          onChange={e => setExperienceFormData({...experienceFormData, description: e.target.value})} 
                          placeholder="e.g. Explore winding pathways..." 
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Icon</Label>
                        <Select value={experienceFormData.icon} onValueChange={(v) => setExperienceFormData({...experienceFormData, icon: v})}>
                          <SelectTrigger>
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {(()=>{ const Ic = (LucideIcons as any)[experienceFormData.icon] || LucideIcons.Footprints; return <Ic className="w-4 h-4 text-primary" /> })()}
                                {experienceFormData.icon}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {AVAILABLE_ICONS.map(i => { const Ic = (LucideIcons as any)[i]; return <SelectItem key={i} value={i}><div className="flex items-center gap-2"><Ic className="w-4 h-4 mr-1 text-muted-foreground"/>{i}</div></SelectItem> })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-center sm:justify-end gap-3 mt-6">
                        <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => setExperienceDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" className="rounded-full px-6 shadow-md bg-primary hover:bg-primary/90">{editingExperience ? 'Update' : 'Add'} Experience</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {loadingExperiences ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : experiences.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-3xl">
                  <LucideIcons.Compass className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No experiences added yet. Create one to display on the website.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {experiences.map((exp) => {
                    const imageUrl = exp.image ? pb.files.getUrl(exp as any, exp.image) : '';
                    const IconComp = (LucideIcons as any)[exp.icon] || LucideIcons.Footprints;
                    
                    return (
                      <div key={exp.id} className="group border border-border rounded-2xl overflow-hidden bg-muted/10 hover:shadow-md transition-all flex flex-col md:flex-row h-auto md:h-40">
                        {imageUrl ? (
                          <div className="h-48 md:h-full md:w-48 relative overflow-hidden bg-muted flex-shrink-0">
                            <img src={imageUrl} alt={exp.title} className="w-full h-full object-cover" />
                            <div className="absolute top-3 left-3 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center text-primary shadow-sm md:hidden">
                              <IconComp className="w-4 h-4" />
                            </div>
                          </div>
                        ) : null}
                        
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              {(!imageUrl || true) && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 hidden md:flex">
                                  <IconComp className="w-4 h-4" />
                                </div>
                              )}
                              <h3 className="font-semibold text-lg">{exp.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{exp.description}</p>
                          </div>
                          
                          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border">
                            <Button variant="ghost" size="sm" className="h-8 hover:bg-primary/10 hover:text-primary" onClick={() => openExperienceEdit(exp)}>
                              <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Experience?</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete "{exp.title}"? This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteExperience(exp.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="pt-8 flex justify-end">
                <Button onClick={handleSaveContent} disabled={saving} className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Experiences Text
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* GALLERY TAB */}
          <TabsContent value="gallery" className="outline-none space-y-6 animate-in fade-in duration-500 fill-mode-forwards">
             <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 lg:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Property Gallery</h2>
                  <p className="text-sm text-muted-foreground mt-1">Upload photos to showcase your property visually to guests.</p>
                </div>
                <Dialog open={galleryDialogOpen} onOpenChange={(open) => {
                  setGalleryDialogOpen(open);
                  if (!open) setGalleryFormData({ title: '', imageFile: null, imagePreview: '' });
                }}>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl font-semibold px-6">
                      <Plus className="w-4 h-4 mr-2" /> Upload Photo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold tracking-tight text-center">Upload New Photo</DialogTitle>
                      <DialogDescription className="text-center text-muted-foreground pb-4">Add a high-quality image to your gallery.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleGallerySubmit} className="space-y-4">
                      <label className="cursor-pointer block bg-muted/10 rounded-2xl border-2 border-dashed border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-all text-center group overflow-hidden relative">
                          {galleryFormData.imagePreview && !galleryFormData.imageFile ? (
                          <img src={galleryFormData.imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-md" />
                        ) : galleryFormData.imageFile ? (
                          <div className="w-full h-40 bg-muted/50 rounded-md flex items-center justify-center text-primary font-medium">Image Selected!</div>
                        ) : (
                          <div className="w-full h-40 bg-muted/50 rounded-md flex flex-col items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                            <span className="text-sm">Select Image</span>
                          </div>
                        )}
                          <input type="file" className="hidden"  accept="image/*" required onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setGalleryFormData({...galleryFormData, imageFile: e.target.files[0]});
                          }
                        }}  />
                        </label>

                      <div className="grid gap-2">
                        <Label>Alternative Text / Caption (Optional)</Label>
                        <AutoResizingTextarea value={galleryFormData.title} onChange={e => setGalleryFormData({...galleryFormData, title: e.target.value})} placeholder="e.g. GameZ exterior" />
                        <p className="text-xs text-muted-foreground">This helps with accessibility and SEO.</p>
                      </div>

                      <div className="flex justify-center sm:justify-end gap-3 mt-6">
                        <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => setGalleryDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" className="rounded-full px-6 shadow-md bg-primary hover:bg-primary/90">Upload</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {loadingGallery ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
              ) : gallery.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-3xl">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Your gallery is empty. Upload some beautiful photos!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {gallery.map((img) => {
                    const imageUrl = img.image ? pb.files.getUrl(img as any, img.image) : '';
                    return (
                      <div key={img.id} className="group relative rounded-xl overflow-hidden bg-muted aspect-[4/3]">
                        <img src={imageUrl} alt={img.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        
                        {img.title && (
                          <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-2 text-xs text-foreground translate-y-full group-hover:translate-y-0 transition-transform">
                            {img.title}
                          </div>
                        )}

                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full shadow-md">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                                <AlertDialogDescription>Are you sure you want to remove this image from the gallery?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteGallery(img.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* REVIEWS TAB */}
          <TabsContent value="reviews" className="outline-none space-y-6 animate-in fade-in duration-500 fill-mode-forwards">
             <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 lg:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Player Testimonials</h2>
                    <p className="text-sm text-muted-foreground mt-1">Manage beautifully designed reviews shown on your frontend.</p>
                  </div>
                  <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => handleOpenReviewDialog()} className="rounded-xl font-semibold px-6 shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Add Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
                      <DialogHeader className="mb-4">
                        <DialogTitle className="text-2xl font-bold tracking-tight">{editingReview ? 'Edit Review' : 'Add New Review'}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">Select the property and paste the player's testimonial here.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="grid gap-2">
                          <Label>Player Name</Label>
                          <Input value={reviewForm.guest_name} onChange={e => setReviewForm(prev => ({ ...prev, guest_name: e.target.value }))} placeholder="e.g. Rohit Patil" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Property</Label>
                          <Select value={reviewForm.property_id} onValueChange={(val) => setReviewForm(prev => ({ ...prev, property_id: val }))}>
                            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select Property" /></SelectTrigger>
                            <SelectContent>
                              {properties.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Review Testimonial</Label>
                          <AutoResizingTextarea 
                            rows={4}
                            value={reviewForm.review_text} 
                            onChange={e => setReviewForm(prev => ({ ...prev, review_text: e.target.value }))} 
                            className="bg-muted/10 border-border rounded-xl px-3 py-2 w-full text-sm border focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                            placeholder="Type the player's beautiful review here..." 
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" className="rounded-full px-6" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveReview} disabled={saving} className="rounded-full px-6 shadow-md bg-primary hover:bg-primary/90">
                          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Save Testimonial
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {loadingReviews ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center bg-muted/10 rounded-2xl border-2 border-dashed border-border">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-muted-foreground font-medium">No reviews added yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Add your first testimonial to showcase on the landing page!</p>
                  </div>
                ) : (
                  <div className="grid gap-4 mt-6">
                    {reviews.map((rev) => (
                       <div key={rev.id} className="flex flex-col sm:flex-row gap-4 justify-between bg-muted/5 p-4 rounded-xl border border-border hover:bg-muted/10 transition-colors">
                          <div className="flex-1 min-w-0 pr-4">
                             <div className="flex items-center gap-2 mb-2">
                               <p className="font-semibold text-foreground text-base truncate">{rev.guest_name}</p>
                               <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                                  {rev.expand?.property_id?.name || 'Unknown Property'}
                               </span>
                             </div>
                             <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed italic">
                                "{rev.review_text}"
                             </p>
                          </div>
                          
                          <div className="flex items-start gap-2 pt-2 sm:pt-0 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => handleOpenReviewDialog(rev)} className="rounded-xl hover:bg-secondary hover:text-secondary-foreground hover:border-transparent">
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive h-9 w-9 rounded-xl hover:bg-destructive/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                                  <AlertDialogDescription>This testimonial will be permanently removed from your website.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={async () => { await handleDeleteReview(rev.id); fetchReviews(); }} className="bg-destructive hover:bg-destructive/90 rounded-full">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                       </div>
                    ))}
                     
                     {/* Pagination Controls */}
                     {reviewsTotalPages > 0 && (
                       <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border pt-6 mt-6 gap-4">
                         <span className="text-sm text-foreground font-medium">
                           {reviewsTotalItems} reviews <span className="mx-2 text-muted-foreground/30">•</span> Page {reviewsPage} of {reviewsTotalPages}
                         </span>
                         
                         <div className="flex gap-2 items-center">
                           <button 
                             onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                             disabled={reviewsPage === 1 || loadingReviews}
                             className="p-2 border rounded-full text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors text-foreground"
                             aria-label="Previous page"
                           >
                             <ChevronLeft className="w-5 h-5" />
                           </button>
                           <button 
                             onClick={() => setReviewsPage(p => Math.min(reviewsTotalPages, p + 1))}
                             disabled={reviewsPage === reviewsTotalPages || loadingReviews}
                             className="p-2 border rounded-full text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:pointer-events-none transition-colors text-foreground"
                             aria-label="Next page"
                           >
                             <ChevronRight className="w-5 h-5" />
                           </button>
                         </div>
                       </div>
                     )}
                  </div>
                )}
             </div>
          </TabsContent>

          {/* FOOTER & CONTACT TAB */}
          <TabsContent value="footer" className="outline-none space-y-8 animate-in fade-in duration-500 fill-mode-forwards">
             <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8 border-b border-border pb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Footer & Global Contact Details</h2>
                    <p className="text-sm text-muted-foreground mt-1">Manage the contact information and descriptive text shown at the bottom of the website.</p>
                  </div>
                  <Button onClick={handleSaveContent} disabled={saving} className="rounded-full px-8 shadow-md">
                     {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                     Save Footer Settings
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                   {/* Left Column: Footer Description & Contact */}
                   <div className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-primary" /> Brand & Footer Display</h3>
                        <div className="bg-muted/10 p-6 rounded-2xl border border-border space-y-5">
                          <div className="grid gap-2">
                             <Label>Footer Short Description</Label>
                             <AutoResizingTextarea 
                               rows={3} 
                               value={footerDescription} 
                               onChange={e => setFooterDescription(e.target.value)} 
                               className="bg-secondary border-border rounded-xl px-3 py-2 w-full text-sm border focus:outline-none focus:ring-1 focus:ring-primary"
                               placeholder="e.g. Experience authentic village life surrounded by tropical nature..." 
                             />
                          </div>
                          <div className="grid gap-2">
                             <Label>Proprietor Name (Copyright Bar)</Label>
                             <Input 
                               value={proprietorName} 
                               onChange={e => setProprietorName(e.target.value)} 
                               placeholder="e.g. Mrs. Sunitha Sylvia Fernandes" 
                               className="bg-secondary border-border"
                             />
                          </div>
                        </div>
                      </div>
                   </div>

                   {/* Right Column: Contact Links & Socials */}
                   <div className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> Contact Details</h3>
                        <div className="bg-muted/10 p-6 rounded-2xl border border-border space-y-5">
                          <div className="grid gap-2">
                             <Label>Contact Phone Number</Label>
                             <Input 
                               value={contactPhone} 
                               onChange={e => setContactPhone(e.target.value)} 
                               placeholder="e.g. +91 8317309867" 
                               className="bg-secondary border-border"
                             />
                          </div>
                          <div className="grid gap-2">
                             <Label>Contact Email Address</Label>
                             <Input 
                               value={contactEmail} 
                               onChange={e => setContactEmail(e.target.value)} 
                               placeholder="e.g. admin@gamez.in" 
                               className="bg-secondary border-border"
                             />
                          </div>
                        </div>
                      </div>
                   </div>
                </div>

             </div>
          </TabsContent>

        </Tabs>
      </div>
    </AdminLayout>
  );
}

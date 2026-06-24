import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import pb from '@/lib/pocketbase';
import { Loader2, Save, Image as ImageIcon, LayoutTemplate, Globe, FileText, Phone, Plus, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const AutoResizingTextarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    resize();
  }, [props.value]);

  useEffect(() => {
    if (!textareaRef.current) return;
    const ro = new ResizeObserver(() => {
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

export default function BrandSettings() {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  // Global Settings State
  const [brandName, setBrandName] = useState('');
  const [logoImageFile, setLogoImageFile] = useState<File | null>(null);
  const [logoImagePreview, setLogoImagePreview] = useState<string>('');
  const [footerDescription, setFooterDescription] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');

  // Legal Policies State
  const [policyTerms, setPolicyTerms] = useState('');
  const [policyPrivacy, setPolicyPrivacy] = useState('');
  const [policyRefund, setPolicyRefund] = useState('');
  const [policyBooking, setPolicyBooking] = useState('');

  // Global About Section
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutSubtitle, setAboutSubtitle] = useState('');
  const [aboutDescription, setAboutDescription] = useState('');
  const [aboutFeatures, setAboutFeatures] = useState([
    { icon: 'Palmtree', title: 'Global Brand', description: 'Experience luxury at any of our distinct locations.' },
  ]);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('brand_settings').getFullList();
      if (records.length > 0) {
        const record = records[0];
        setRecordId(record.id);
        
        setBrandName(record.brand_name || '');
        if (record.logo_image) setLogoImagePreview(pb.files.getUrl(record, record.logo_image));
        else setLogoImagePreview('');

        setFooterDescription(record.footer_description || '');
        setSocialFacebook(record.social_facebook || '');
        setSocialInstagram(record.social_instagram || '');

        setPolicyTerms(record.policy_terms || '');
        setPolicyPrivacy(record.policy_privacy || '');
        setPolicyRefund(record.policy_refund || '');
        setPolicyBooking(record.policy_booking || '');

        setAboutTitle(record.about_title || '');
        setAboutSubtitle(record.about_subtitle || '');
        setAboutDescription(record.about_description || '');
        if (record.about_features && Array.isArray(record.about_features)) {
           setAboutFeatures(record.about_features);
        }
      }
    } catch (error) {
      console.error('Error fetching brand settings:', error);
      // If collection doesn't exist yet or is empty, it's fine
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContent = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      
      formData.append('brand_name', brandName);
      if (logoImageFile) formData.append('logo_image', logoImageFile);

      formData.append('footer_description', footerDescription);
      formData.append('social_facebook', socialFacebook);
      formData.append('social_instagram', socialInstagram);

      formData.append('policy_terms', policyTerms);
      formData.append('policy_privacy', policyPrivacy);
      formData.append('policy_refund', policyRefund);
      formData.append('policy_booking', policyBooking);

      formData.append('about_title', aboutTitle);
      formData.append('about_subtitle', aboutSubtitle);
      formData.append('about_description', aboutDescription);
      formData.append('about_features', JSON.stringify(aboutFeatures));

      let updatedRecord;
      if (recordId) {
        updatedRecord = await pb.collection('brand_settings').update(recordId, formData);
      } else {
        updatedRecord = await pb.collection('brand_settings').create(formData);
        setRecordId(updatedRecord.id);
      }

      if (updatedRecord.logo_image) setLogoImagePreview(pb.files.getUrl(updatedRecord, updatedRecord.logo_image));
      setLogoImageFile(null);

      toast({ title: 'Success', description: 'Brand settings saved successfully!' });
    } catch (error: any) {
      console.error('Error saving brand settings:', error);
      toast({ title: 'Update Failed', description: error?.message || 'Check console for errors', variant: 'destructive' });
      if (error?.data) {
        console.log("PocketBase Validation Errors:", error.data);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Brand Settings</h1>
            <p className="text-muted-foreground mt-1">Manage brand-wide configuration, social links, and legal policies.</p>
          </div>
          <Button onClick={handleSaveContent} disabled={saving} className="rounded-full px-8 shadow-md">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Brand Settings
          </Button>
        </div>

        <div className="grid gap-8">
          {/* Identity & Socials */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="rounded-3xl border border-border shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><Globe className="w-5 h-5 text-primary"/> Brand Identity</CardTitle>
                <CardDescription>The core brand logo and footer narrative.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label>Brand Name (Internal/Meta)</Label>
                  <Input 
                    value={brandName} 
                    onChange={e => setBrandName(e.target.value)} 
                    placeholder="e.g. SN Resorts & Villas" 
                    className="bg-secondary border-border"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Brand Logo (Primary)</Label>
                  <div className="flex items-center gap-4">
                    {logoImagePreview && !logoImageFile ? (
                      <div className="relative w-24 h-24 bg-secondary rounded-md overflow-hidden flex-shrink-0 shadow-sm border border-border flex items-center justify-center p-2">
                        <img src={logoImagePreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-secondary border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center text-muted-foreground flex-shrink-0">
                        <ImageIcon className="h-6 w-6 mb-1" />
                        <span className="text-xs">No logo</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <Input type="file" accept="image/*" onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) setLogoImageFile(e.target.files[0]);
                      }} />
                      <p className="text-xs text-muted-foreground mt-2">Upload a PNG or SVG logo for the top navigation bar.</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Global Footer Description</Label>
                  <AutoResizingTextarea 
                    rows={3} 
                    value={footerDescription} 
                    onChange={e => setFooterDescription(e.target.value)} 
                    className="bg-secondary border-border rounded-xl px-3 py-2 w-full text-sm border focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. SN Resorts is a premium collection of stays celebrating tropical nature..." 
                  />
                  <p className="text-[11px] text-muted-foreground leading-tight">This will show in the footer across all properties, unless a specific property overrides it.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border shadow-sm bg-card">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><Phone className="w-5 h-5 text-primary"/> Social Presence</CardTitle>
                <CardDescription>Official social media links for the brand.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                   <Label>Facebook URL</Label>
                   <Input 
                     value={socialFacebook} 
                     onChange={e => setSocialFacebook(e.target.value)} 
                     placeholder="https://facebook.com/..." 
                     className="bg-secondary border-border"
                   />
                </div>
                <div className="grid gap-2">
                   <Label>Instagram URL</Label>
                   <Input 
                     value={socialInstagram} 
                     onChange={e => setSocialInstagram(e.target.value)} 
                     placeholder="https://instagram.com/..." 
                     className="bg-secondary border-border"
                   />
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-border shadow-sm bg-card md:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-primary"/> Brand Story & About</CardTitle>
                <CardDescription>The global narrative displayed on the primary Brand Portal and shared across resorts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="aboutTitle">About Title</Label>
                    <Input id="aboutTitle" value={aboutTitle} onChange={e => setAboutTitle(e.target.value)} placeholder="e.g. Welcome to SN Resorts" className="bg-secondary border-border" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="aboutSubtitle">About Subtitle</Label>
                    <Input id="aboutSubtitle" value={aboutSubtitle} onChange={e => setAboutSubtitle(e.target.value)} placeholder="e.g. A collection of timeless sanctuaries..." className="bg-secondary border-border" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="aboutDescription">About Description</Label>
                  <AutoResizingTextarea id="aboutDescription" value={aboutDescription} onChange={e => setAboutDescription(e.target.value)} placeholder="Bring the story of your brand to life..." className="bg-secondary border-border" />
                </div>
                
                <div className="grid gap-4 mt-8">
                  <div className="flex justify-between items-center mb-2 border-b border-border pb-4">
                    <Label className="text-lg">Key Features (3 Recommended)</Label>
                    <Button variant="outline" size="sm" onClick={() => setAboutFeatures([...aboutFeatures, { icon: 'Star', title: '', description: '' }])}>
                      <Plus className="h-4 w-4 mr-1" /> Add Feature
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    {aboutFeatures.map((feature, index) => {
                      const SelectedIcon = (LucideIcons as any)[feature.icon] || LucideIcons.Star;
                      return (
                        <div key={index} className="flex flex-col gap-4 bg-secondary/50 p-5 rounded-2xl border border-border relative group">
                          <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-background shadow-sm border border-border text-destructive hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setAboutFeatures(aboutFeatures.filter((_, i) => i !== index))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="grid gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground">Icon</Label>
                            <Select value={feature.icon} onValueChange={(val) => { const nw = [...aboutFeatures]; nw[index].icon = val; setAboutFeatures(nw); }}>
                              <SelectTrigger className="bg-background border-border"><SelectValue><div className="flex items-center gap-2"><SelectedIcon className="w-4 h-4 text-primary" /><span className="truncate">{feature.icon}</span></div></SelectValue></SelectTrigger>
                              <SelectContent className="max-h-[200px] border-border">{AVAILABLE_ICONS.map(i => { const Ig = (LucideIcons as any)[i]; return <SelectItem key={i} value={i}><div className="flex items-center gap-2"><Ig className="w-4 h-4 text-muted-foreground mr-1" />{i}</div></SelectItem> })}</SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs font-semibold text-muted-foreground">Title</Label>
                            <Input value={feature.title} onChange={(e) => { const nw = [...aboutFeatures]; nw[index].title = e.target.value; setAboutFeatures(nw); }} className="bg-background border-border" />
                          </div>
                          <div className="grid gap-2 flex-1">
                            <Label className="text-xs font-semibold text-muted-foreground">Description</Label>
                            <AutoResizingTextarea value={feature.description} onChange={(e) => { const nw = [...aboutFeatures]; nw[index].description = e.target.value; setAboutFeatures(nw); }} className="bg-background border-border h-full" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Policies */}
          <Card className="rounded-3xl border border-border shadow-sm bg-card pb-8">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> Legal & Policies</CardTitle>
              <CardDescription>Brand-wide policies that apply universally to all properties and bookings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-12 mt-4">
               {/* Terms and Conditions */}
               <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Terms and Conditions</h3>
                  <p className="text-sm text-muted-foreground">The general rules and terms agreed to by guests using the website.</p>
                  <div className="bg-background rounded-xl border border-border overflow-hidden pb-12">
                    {/* @ts-ignore */}
                    <ReactQuill theme="snow" value={policyTerms} onChange={setPolicyTerms} className="h-64" />
                  </div>
               </div>

               {/* Privacy Policy */}
               <div className="space-y-4 pt-8 border-t border-border">
                  <h3 className="text-xl font-semibold">Privacy Policy</h3>
                  <p className="text-sm text-muted-foreground">Information on how guest data is collected, used, and stored.</p>
                  <div className="bg-background rounded-xl border border-border overflow-hidden pb-12">
                    {/* @ts-ignore */}
                    <ReactQuill theme="snow" value={policyPrivacy} onChange={setPolicyPrivacy} className="h-64" />
                  </div>
               </div>

               {/* Refund Policy */}
               <div className="space-y-4 pt-8 border-t border-border">
                  <h3 className="text-xl font-semibold">Refund Policy</h3>
                  <p className="text-sm text-muted-foreground">Details about cancellations, modifications, and refunds.</p>
                  <div className="bg-background rounded-xl border border-border overflow-hidden pb-12">
                    {/* @ts-ignore */}
                    <ReactQuill theme="snow" value={policyRefund} onChange={setPolicyRefund} className="h-64" />
                  </div>
               </div>

               {/* Booking Policy */}
               <div className="space-y-4 pt-8 border-t border-border">
                  <h3 className="text-xl font-semibold">Booking Policy</h3>
                  <p className="text-sm text-muted-foreground">Rules specifically regarding reservations, check-ins, and payments.</p>
                  <div className="bg-background rounded-xl border border-border overflow-hidden pb-12">
                    {/* @ts-ignore */}
                    <ReactQuill theme="snow" value={policyBooking} onChange={setPolicyBooking} className="h-64" />
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

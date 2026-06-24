import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import pb from '@/lib/pocketbase';
import { useProperty } from '@/contexts/PropertyContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { AlertCircle, TrendingUp, Info, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfYear, differenceInDays, parseISO as dateFnsParseISO, isAfter, startOfMonth, formatDistanceToNow } from 'date-fns';

type InsightCardProps = {
  icon: 'info' | 'positive' | 'warning';
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

const InsightCard = ({ icon, title, body, actionLabel, onAction }: InsightCardProps) => {
  const icons = {
    info: <Info className="w-4 h-4 text-blue-600" />,
    positive: <CheckCircle2 className="w-4 h-4 text-green-600" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-600" />
  };

  const bgColors = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
    positive: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
  };

  return (
    <div className={`p-4 rounded-2xl border border-border bg-card flex flex-col gap-2 shadow-sm`}>
      <div className="flex gap-2 items-center">
        <div className={`p-1.5 rounded-xl border ${bgColors[icon]}`}>
          {icons[icon]}
        </div>
        <h4 className="text-[13px] font-medium text-foreground">{title}</h4>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed font-normal">{body}</p>
      {actionLabel && (
        <button 
          onClick={onAction}
          className="text-[12px] font-medium text-primary self-start mt-1 hover:underline cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Utils
const formatCurrency = (val: number) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
};

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea'];
const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

const parseISO = (dateStr: any) => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  try {
    return dateFnsParseISO(dateStr);
  } catch (e) {
    return new Date();
  }
};

export default function Analytics() {
  const { properties, activeProperty, loading: propLoading } = useProperty();
  const [dateRange, setDateRange] = useState('all_time');
  const [selectedPropId, setSelectedPropId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Raw Data State
  const [bookings, setBookings] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  
  useEffect(() => {
    if (!propLoading && activeProperty && selectedPropId === 'all') {
      // By default when mounted, if we want default to active property, we can set it:
      // setSelectedPropId(activeProperty.id); 
      // But user requested "all" or specific. We default to 'all' as per standard dashboards.
    }
  }, [propLoading, activeProperty]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate start date
      let startDateStr = '';
      const now = new Date();
      if (dateRange === '30_days') startDateStr = format(subDays(now, 30), 'yyyy-MM-dd');
      else if (dateRange === '90_days') startDateStr = format(subDays(now, 90), 'yyyy-MM-dd');
      else if (dateRange === 'this_year') startDateStr = format(startOfYear(now), 'yyyy-MM-dd');

      let bookingFilter = '';
      if (startDateStr) {
        bookingFilter = `created >= "${startDateStr} 00:00:00"`;
      }
      if (selectedPropId !== 'all') {
        bookingFilter += bookingFilter ? ` && property_id = "${selectedPropId}"` : `property_id = "${selectedPropId}"`;
      }

      let stationFilter = '';
      if (selectedPropId !== 'all') {
        stationFilter = `property_id = "${selectedPropId}"`;
      }

      console.log("Analytics Fetching with filter:", bookingFilter);

      const [bRes, rRes] = await Promise.all([
        pb.collection('bookings').getFullList({ filter: bookingFilter, requestKey: 'analytics_bookings' }),
        pb.collection('stations').getFullList({ filter: stationFilter, requestKey: 'analytics_stations' })
      ]);
      
      console.log("Analytics fetched bookings:", bRes.length);
      console.log("Analytics fetched stations:", rRes.length);

      setBookings(bRes);
      setStations(rRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!propLoading) {
      fetchData();
    }
  }, [dateRange, selectedPropId, propLoading]);

  // Derived metrics
  const totalRevenue = useMemo(() => bookings.reduce((sum, b) => sum + (b.price || b.total_amount || 0), 0), [bookings]);
  const totalBookings = bookings.length;
  
  const avgStayLength = useMemo(() => {
    if (bookings.length === 0) return 0;
    const totalDays = bookings.reduce((sum, b) => {
      const start = parseISO(b.check_in_date || b.created);
      const end = parseISO(b.check_out_date || b.created);
      return sum + Math.max(1, differenceInDays(end, start));
    }, 0);
    return Math.round((totalDays / bookings.length) * 10) / 10;
  }, [bookings]);

  // Occupancy is tricky without historical station counts, we'll estimate: (booked station hours / available station hours in period)
  const avgOccupancy = useMemo(() => {
    if (stations.length === 0 || bookings.length === 0) return 0;
    let daysInPeriod = 30;
    if (dateRange === '90_days') daysInPeriod = 90;
    else if (dateRange === 'this_year') daysInPeriod = differenceInDays(new Date(), startOfYear(new Date())) || 1;

    const availableNights = stations.length * daysInPeriod;
    const bookedNights = bookings.reduce((sum, b) => {
      const start = parseISO(b.check_in_date || b.created);
      const end = parseISO(b.check_out_date || b.created);
      return sum + Math.max(1, differenceInDays(end, start));
    }, 0);

    return Math.min(100, Math.round((bookedNights / availableNights) * 100));
  }, [bookings, stations, dateRange]);

  // Insights generation Engine
  const insights = useMemo(() => {
    const list: InsightCardProps[] = [];
    if (bookings.length === 0) return list;

    // 1. Mid-week dip
    const weekdayBookings = bookings.filter(b => {
      const d = parseISO(b.check_in_date || b.created).getDay();
      return d >= 1 && d <= 3; // Mon-Wed
    }).length;
    const weekendBookings = bookings.filter(b => {
      const d = parseISO(b.check_in_date || b.created).getDay();
      return d === 5 || d === 6 || d === 0; // Fri-Sun
    }).length;

    // Normalizing by days (3 weekdays, 3 weekends roughly)
    if (weekendBookings > 0 && weekdayBookings < weekendBookings * 0.5) {
      list.push({
        icon: 'warning',
        title: 'Mid-week dip detected',
        body: `Your Mon-Wed check-ins are significantly lower than weekends. A mid-week discount could recover estimated revenue.`,
        actionLabel: 'Explore promotion strategy'
      });
    }

    // 4. Low usage station alert
    if (stations.length > 0) {
      const bookingCountsByStation: Record<string, number> = {};
      bookings.forEach(b => {
        if (b.station_id) bookingCountsByStation[b.station_id] = (bookingCountsByStation[b.station_id] || 0) + 1;
      });
      const avgStationBookings = totalBookings / stations.length;
      
      const slowStations = stations.filter(r => (bookingCountsByStation[r.id] || 0) < avgStationBookings * 0.5);
      if (slowStations.length > 0) {
        list.push({
          icon: 'warning',
          title: 'Low usage station alert',
          body: `${slowStations[0].name || slowStations[0].station_number} has only ${bookingCountsByStation[slowStations[0].id] || 0} bookings this period — well below property average. Consider repricing.`,
          actionLabel: 'View station settings'
        });
      }
    }

    // 5. Booking lead time
    let totalLeadTime = 0;
    let validLeadTimes = 0;
    bookings.forEach(b => {
      if (b.check_in_date && b.created) {
        const lead = differenceInDays(parseISO(b.check_in_date), parseISO(b.created));
        if (lead >= 0) {
          totalLeadTime += lead;
          validLeadTimes++;
        }
      }
    });

    const avgLead = validLeadTimes > 0 ? Math.round(totalLeadTime / validLeadTimes) : 0;
    if (avgLead < 3) {
      list.push({
        icon: 'info',
        title: 'Last-minute dominating',
        body: `Guests book just ${avgLead} days in advance on average. Ensure real-time availability is always synced.`,
      });
    } else if (avgLead > 14) {
      list.push({
        icon: 'positive',
        title: 'Strong advance bookings',
        body: `Guests book ${avgLead} days in advance on average. A non-refundable early-bird discount could lock in more revenue.`,
      });
    } else {
       list.push({
        icon: 'info',
        title: 'Steady booking window',
        body: `Guests are booking ${avgLead} days in advance on average, providing a healthy predictive pipeline.`,
       });
    }

    // 6. Revenue Momentum (Trend Analysis)
    if (bookings.length > 10) {
       // Sort bookings by creation date
       const sorted = [...bookings].sort((a,b) => new Date(a.created).getTime() - new Date(b.created).getTime());
       const halfIndex = Math.floor(sorted.length / 2);
       const firstHalf = sorted.slice(0, halfIndex).reduce((sum, b) => sum + (b.price || b.total_amount || 0), 0);
       const secondHalf = sorted.slice(halfIndex).reduce((sum, b) => sum + (b.price || b.total_amount || 0), 0);
       
       if (firstHalf > 0) {
         const growth = ((secondHalf - firstHalf) / firstHalf) * 100;
         if (growth > 15) {
            list.push({
               icon: 'positive',
               title: 'Revenue momentum growing',
               body: `Recent bookings are generating ${Math.round(growth)}% more revenue than the earlier half of this period. Trend is upward.`,
               actionLabel: 'View pricing strategy'
            });
         } else if (growth < -15) {
            list.push({
               icon: 'warning',
               title: 'Revenue momentum slowing',
               body: `Recent bookings have generated ${Math.abs(Math.round(growth))}% less revenue than the earlier half. Consider a flash sale.`,
            });
         }
       }
    }

    // 7. Top Source
    const sources: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.source) sources[b.source] = (sources[b.source] || 0) + 1;
    });
    if (sources['direct'] && sources['direct'] > totalBookings * 0.5) {
       list.push({
         icon: 'positive',
         title: 'Direct channels dominating',
         body: `Over ${Math.round((sources['direct'] / totalBookings) * 100)}% of your bookings are direct, saving you significant OTA commissions. Keep pushing your direct booking engine.`,
       });
    }

    return list.slice(0, 3); // Max 3 insights
  }, [bookings, stations, totalBookings]);

  // Chart Data preparation
  
  // Left: Revenue Trend (grouped by month or week based on dateRange)
  const revenueTrendData = useMemo(() => {
    const dataMap: Record<string, any> = {};
    bookings.forEach(b => {
      if (b.status !== 'cancelled') {
        const date = parseISO(b.created);
        const key = dateRange === '30_days' ? format(date, 'MMM dd') : format(date, 'MMM yyyy');
        if (!dataMap[key]) {
          dataMap[key] = { name: key };
          properties.forEach(p => dataMap[key][p.id] = 0);
        }
        if (b.property_id && dataMap[key][b.property_id] !== undefined) {
          dataMap[key][b.property_id] += (b.price || b.total_amount || 0);
        }
      }
    });
    // Sort keys chronologically (simple sort assuming standard formats)
    return Object.values(dataMap);
  }, [bookings, properties, dateRange]);

  // Right: Source Donut
  const sourceData = useMemo(() => {
    const counts = { direct: 0, walk_in: 0, ota: 0 };
    bookings.forEach(b => {
      if (b.source === 'ota') counts.ota++;
      else if (b.source === 'walk_in') counts.walk_in++;
      else counts.direct++;
    });
    return [
      { name: 'Direct', value: counts.direct },
      { name: 'OTA', value: counts.ota },
      { name: 'Walk-in', value: counts.walk_in }
    ].filter(d => d.value > 0);
  }, [bookings]);
  const sourceTotal = sourceData.reduce((sum, d) => sum + d.value, 0);

  // Daily Check-ins Line chart
  const dailyCheckinsData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.check_in_date) {
        const key = format(parseISO(b.check_in_date), 'MMM dd');
        dataMap[key] = (dataMap[key] || 0) + 1;
      }
    });
    // Fill gaps
    let days = dateRange === '30_days' ? 30 : dateRange === '90_days' ? 90 : 90; // default 90 max
    if (days > 90) days = 90; 
    
    // Reverse iterating arrays could be better but let's just use existing ones
    const sortedDates = Object.keys(dataMap).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    return sortedDates.map(k => ({ date: k, checkins: dataMap[k] }));
  }, [bookings, dateRange]);

  // Station performance stats
  const stationStats = useMemo(() => {
     const stats: any[] = [];
     const avgBkg = stations.length ? totalBookings / stations.length : 0;
     stations.forEach(r => {
        const stationBkg = bookings.filter(b => b.station_id === r.id).length;
        let status = 'Avg';
        if (stationBkg > avgBkg * 1.3) status = 'Hot';
        if (stationBkg < avgBkg * 0.7) status = 'Slow';
        
        stats.push({ name: r.name || r.station_number, bookings: stationBkg, status });
     });
     return stats.sort((a,b) => b.bookings - a.bookings);
  }, [bookings, stations, totalBookings]);

  // Player Insights
  const guestInsights = useMemo(() => {
     let newG = 0, retG = 0;
     const emailCounts: Record<string, number> = {};
     bookings.forEach(b => {
       if (b.guest_email) emailCounts[b.guest_email] = (emailCounts[b.guest_email] || 0) + 1;
     });
     Object.values(emailCounts).forEach(c => {
       if (c > 1) retG++;
       else newG++;
     });
     return { newG, retG };
  }, [bookings]);

  if (propLoading || loading) {
    return <AdminLayout>
      <div className="flex justify-center items-center h-[50vh]">
         <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    </AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in duration-500">
        
        {/* Header & Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">AI-powered intelligence and insights for your properties</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
             <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px] bg-card border-border rounded-xl">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30_days">Last 30 days</SelectItem>
                  <SelectItem value="90_days">Last 90 days</SelectItem>
                  <SelectItem value="this_year">This year</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                </SelectContent>
             </Select>
             <Select value={selectedPropId} onValueChange={setSelectedPropId}>
                <SelectTrigger className="w-[160px] bg-card border-border rounded-xl">
                  <SelectValue placeholder="Property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
             </Select>
          </div>
        </div>

        {/* Section 1: Overview Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[{ label: 'Total revenue', val: formatCurrency(totalRevenue) },
            { label: 'Total bookings', val: totalBookings },
            { label: 'Avg occupancy', val: `${avgOccupancy}%` },
            { label: 'Avg stay length', val: `${avgStayLength} days` }
           ].map((m, i) => (
             <div key={i} className="bg-secondary/30 border border-border p-5 rounded-3xl shadow-sm">
               <p className="text-sm text-muted-foreground font-medium">{m.label}</p>
               <h2 className="text-[28px] font-semibold text-foreground mt-2 tracking-tight">{m.val}</h2>
             </div>
           ))}
        </div>

        {/* Section 2: AI Smart Insights */}
        {insights.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground tracking-tight uppercase tracking-wider">Smart Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {insights.map((ins, i) => (
                 <InsightCard key={i} {...ins} />
               ))}
            </div>
          </div>
        )}

        {/* Section 3: Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 border border-border bg-card rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-semibold text-foreground">Revenue Trend</h3>
                 <div className="flex gap-4">
                   {properties.filter(p => selectedPropId === 'all' || selectedPropId === p.id).map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[12px] text-muted-foreground font-medium">{p.name}</span>
                      </div>
                   ))}
                 </div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      {properties.map((p, i) => (
                        <linearGradient key={p.id} id={`color-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.1}/>
                          <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888888' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888888' }} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card)' }}
                      labelStyle={{ fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '4px' }}
                      itemStyle={{ fontSize: '13px', fontWeight: 500 }}
                    />
                    {properties.filter(p => selectedPropId === 'all' || selectedPropId === p.id).map((p, i) => (
                      <Area key={p.id} type="monotone" dataKey={p.id} stroke={COLORS[i % COLORS.length]} strokeWidth={2} fillOpacity={1} fill={`url(#color-${p.id})`} activeDot={{ r: 4, strokeWidth: 0 }} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="border border-border bg-card rounded-3xl p-6 flex flex-col shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-2">Booking Sources</h3>
              <div className="flex-1 flex justify-center items-center">
                {sourceData.length > 0 ? (
                  <div className="w-full h-[180px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {sourceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)' }}
                          formatter={(value: number) => [`${value} bookings`, undefined]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                       <span className="text-[24px] font-bold text-foreground">{sourceTotal}</span>
                       <span className="text-[11px] text-muted-foreground">Total</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] text-muted-foreground">No source data available</p>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                 {sourceData.map((d, i) => (
                   <div key={d.name} className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                     <span className="text-[12px] text-muted-foreground font-medium">{d.name} <span className="opacity-70">({Math.round(d.value/sourceTotal*100)}%)</span></span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Section 4 & 5... combining the rest efficiently */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="border border-border bg-card rounded-3xl p-6 shadow-sm">
             <h3 className="text-sm font-semibold text-foreground mb-6">Station Performance</h3>
             <div className="overflow-y-auto max-h-[250px] pr-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-[12px] font-medium text-muted-foreground">Station Name</th>
                      <th className="pb-3 text-[12px] font-medium text-muted-foreground text-right">Bookings</th>
                      <th className="pb-3 text-[12px] font-medium text-muted-foreground text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stationStats.map((r, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="py-3 text-[13px] text-foreground font-medium">{r.name}</td>
                        <td className="py-3 text-[13px] text-muted-foreground text-right">{r.bookings}</td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            r.status === 'Hot' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' :
                            r.status === 'Slow' ? 'bg-secondary/40 text-muted-foreground border border-border/20' :
                            'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>

          <div className="border border-border bg-card rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
             <div>
               <h3 className="text-sm font-semibold text-foreground mb-4">Player Insights</h3>
               <div className="grid grid-cols-3 gap-3">
                  <div className="bg-secondary/30 border border-border p-4 rounded-2xl">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">New Guests</p>
                    <p className="text-xl font-bold text-foreground">{guestInsights.newG}</p>
                  </div>
                  <div className="bg-secondary/30 border border-border p-4 rounded-2xl">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Returning</p>
                    <p className="text-xl font-bold text-foreground">{guestInsights.retG}</p>
                  </div>
                  <div className="bg-secondary/30 border border-border p-4 rounded-2xl">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Avg Lead Time</p>
                    <p className="text-xl font-bold text-foreground">
                      {bookings.length > 0 ? (() => {
                        let totalCount = 0;
                        let valid = 0;
                        bookings.forEach(b => {
                          if (b.check_in_date && b.created) {
                            const lead = differenceInDays(parseISO(b.check_in_date), parseISO(b.created));
                            if (lead >= 0) { totalCount += lead; valid++; }
                          }
                        });
                        return valid > 0 ? `${Math.round(totalCount/valid)}d` : '-';
                      })() : '-'}
                    </p>
                  </div>
               </div>
             </div>
             <div>
               <h3 className="text-sm font-semibold text-foreground mb-4">Daily Check-ins</h3>
               <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyCheckinsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.2} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={['dataMin', 'dataMax + 2']} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)' }}
                      />
                      <Line type="monotone" dataKey="checkins" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
             </div>
          </div>
          
        </div>

      </div>
    </AdminLayout>
  );
}

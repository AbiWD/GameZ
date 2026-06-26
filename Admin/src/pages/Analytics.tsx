import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import pb from '@/lib/pocketbase';
import { useProperty } from '@/contexts/PropertyContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, BarChart, Bar } from 'recharts';
import { AlertCircle, TrendingUp, Info, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfYear, differenceInDays, differenceInMinutes, parseISO as dateFnsParseISO, getHours } from 'date-fns';

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
const PIE_COLORS = ['#3b82f6', '#f59e0b'];

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
  const [dateRange, setDateRange] = useState('30_days');
  const [selectedPropId, setSelectedPropId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Raw Data State
  const [bookings, setBookings] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  
  useEffect(() => {
    if (!propLoading && activeProperty && selectedPropId === 'all') {
    }
  }, [propLoading, activeProperty]);

  const fetchData = async () => {
    setLoading(true);
    try {
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

      const [bRes, rRes] = await Promise.all([
        pb.collection('bookings').getFullList({ filter: bookingFilter, requestKey: 'analytics_bookings' }),
        pb.collection('stations').getFullList({ filter: stationFilter, requestKey: 'analytics_stations' })
      ]);
      
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
  const totalRevenue = useMemo(() => bookings.reduce((sum, b) => sum + (b.total_price || 0), 0), [bookings]);
  const totalBookings = bookings.length;
  
  const avgSessionLength = useMemo(() => {
    if (bookings.length === 0) return 0;
    const totalMinutes = bookings.reduce((sum, b) => {
      const start = parseISO(b.start_time || b.created);
      const end = b.end_time ? parseISO(b.end_time) : new Date();
      return sum + Math.max(0, differenceInMinutes(end, start));
    }, 0);
    return Math.round((totalMinutes / 60 / bookings.length) * 10) / 10;
  }, [bookings]);

  // Utilization: (booked station hours / available station hours in period) -> Assume 12 hours available per day
  const avgUtilization = useMemo(() => {
    if (stations.length === 0 || bookings.length === 0) return 0;
    let daysInPeriod = 30;
    if (dateRange === '90_days') daysInPeriod = 90;
    else if (dateRange === 'this_year') daysInPeriod = differenceInDays(new Date(), startOfYear(new Date())) || 1;
    else if (dateRange === 'all_time') daysInPeriod = 365;

    const availableHours = stations.length * daysInPeriod * 12; // 12 hours per day operational
    const bookedHours = bookings.reduce((sum, b) => {
      const start = parseISO(b.start_time || b.created);
      const end = b.end_time ? parseISO(b.end_time) : new Date();
      return sum + Math.max(0, differenceInMinutes(end, start) / 60);
    }, 0);

    return Math.min(100, Math.round((bookedHours / availableHours) * 100));
  }, [bookings, stations, dateRange]);

  // Insights generation Engine
  const insights = useMemo(() => {
    const list: InsightCardProps[] = [];
    if (bookings.length === 0) return list;

    // 1. Peak Booking Hours
    const hourCounts: Record<number, number> = {};
    bookings.forEach(b => {
      const h = getHours(parseISO(b.start_time || b.created));
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    let peakHour = 0;
    let maxCount = 0;
    Object.keys(hourCounts).forEach(h => {
      if (hourCounts[parseInt(h)] > maxCount) {
        maxCount = hourCounts[parseInt(h)];
        peakHour = parseInt(h);
      }
    });

    const formatHour = (h: number) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formatted = h % 12 || 12;
        return `${formatted} ${ampm}`;
    };

    if (maxCount > totalBookings * 0.15) { // If a single hour has > 15% of all bookings
      list.push({
        icon: 'info',
        title: 'Peak hour identified',
        body: `Your busiest time is around ${formatHour(peakHour)} with ${maxCount} sessions. Ensure adequate staff coverage during this rush.`,
      });
    }

    // 2. High Walk-in Dependency
    const walkInBookings = bookings.filter(b => b.booking_reference?.startsWith('OT-'));
    const walkInRevenue = walkInBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const walkInRevPercent = totalRevenue > 0 ? (walkInRevenue / totalRevenue) * 100 : 0;

    if (walkInRevPercent > 80) {
      list.push({
        icon: 'warning',
        title: 'High walk-in dependency',
        body: `${Math.round(walkInRevPercent)}% of your revenue comes from walk-ins. Consider incentivizing advance bookings to secure guaranteed revenue.`,
      });
    } else if (walkInRevPercent < 40) {
       list.push({
        icon: 'positive',
        title: 'Strong advance pipeline',
        body: `Over ${100 - Math.round(walkInRevPercent)}% of revenue is from advance bookings, giving you excellent revenue predictability.`,
      });
    }

    // 3. Low usage station alert
    if (stations.length > 0) {
      const bookingHoursByStation: Record<string, number> = {};
      bookings.forEach(b => {
        if (b.assigned_station_id) {
            const start = parseISO(b.start_time || b.created);
            const end = b.end_time ? parseISO(b.end_time) : new Date();
            const hours = differenceInMinutes(end, start) / 60;
            bookingHoursByStation[b.assigned_station_id] = (bookingHoursByStation[b.assigned_station_id] || 0) + hours;
        }
      });
      const avgStationHours = Object.values(bookingHoursByStation).reduce((a,b)=>a+b, 0) / stations.length;
      
      const slowStations = stations.filter(r => (bookingHoursByStation[r.id] || 0) < avgStationHours * 0.4);
      if (slowStations.length > 0 && avgStationHours > 5) {
        list.push({
          icon: 'warning',
          title: 'Low utilization station',
          body: `${slowStations[0].name || slowStations[0].station_number} is significantly underperforming the average by hours booked. Consider checking hardware or running a promotion.`,
          actionLabel: 'View station settings'
        });
      }
    }

    // 4. Revenue Momentum (Trend Analysis)
    if (bookings.length > 10) {
       const sorted = [...bookings].sort((a,b) => new Date(a.created).getTime() - new Date(b.created).getTime());
       const halfIndex = Math.floor(sorted.length / 2);
       const firstHalf = sorted.slice(0, halfIndex).reduce((sum, b) => sum + (b.total_price || 0), 0);
       const secondHalf = sorted.slice(halfIndex).reduce((sum, b) => sum + (b.total_price || 0), 0);
       
       if (firstHalf > 0) {
         const growth = ((secondHalf - firstHalf) / firstHalf) * 100;
         if (growth > 15) {
            list.push({
               icon: 'positive',
               title: 'Revenue momentum growing',
               body: `Recent bookings are generating ${Math.round(growth)}% more revenue than the earlier half of this period. Trend is upward.`,
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

    return list.slice(0, 3); // Max 3 insights
  }, [bookings, stations, totalBookings, totalRevenue]);

  // Chart Data preparation
  
  // Left: Revenue Trend (grouped by month or week based on dateRange)
  const revenueTrendData = useMemo(() => {
    const dataMap: Record<string, any> = {};
    bookings.forEach(b => {
      if (b.status !== 'cancelled') {
        const date = parseISO(b.start_time || b.created);
        const key = dateRange === '30_days' ? format(date, 'MMM dd') : format(date, 'MMM yyyy');
        if (!dataMap[key]) {
          dataMap[key] = { name: key };
          properties.forEach(p => dataMap[key][p.id] = 0);
        }
        if (b.property_id && dataMap[key][b.property_id] !== undefined) {
          dataMap[key][b.property_id] += (b.total_price || 0);
        }
      }
    });
    return Object.values(dataMap);
  }, [bookings, properties, dateRange]);

  // Right: Source Donut (Walk-in vs Advance)
  const sourceData = useMemo(() => {
    const counts = { walk_in: 0, advance: 0 };
    bookings.forEach(b => {
      if (b.booking_reference?.startsWith('OT-')) counts.walk_in++;
      else counts.advance++;
    });
    return [
      { name: 'Walk-in', value: counts.walk_in },
      { name: 'Advance', value: counts.advance }
    ].filter(d => d.value > 0);
  }, [bookings]);
  const sourceTotal = sourceData.reduce((sum, d) => sum + d.value, 0);

  // Daily Sessions Line chart
  const dailyCheckinsData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.start_time) {
        const key = format(parseISO(b.start_time), 'MMM dd');
        dataMap[key] = (dataMap[key] || 0) + 1;
      }
    });
    let days = dateRange === '30_days' ? 30 : dateRange === '90_days' ? 90 : 90;
    if (days > 90) days = 90; 
    
    const sortedDates = Object.keys(dataMap).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    return sortedDates.map(k => ({ date: k, sessions: dataMap[k] }));
  }, [bookings, dateRange]);

  // Station performance stats
  const stationStats = useMemo(() => {
     const stats: any[] = [];
     const avgBkg = stations.length ? totalBookings / stations.length : 0;
     stations.forEach(r => {
        const stationBkg = bookings.filter(b => b.assigned_station_id === r.id).length;
        let status = 'Avg';
        if (stationBkg > avgBkg * 1.3) status = 'Hot';
        if (stationBkg < avgBkg * 0.7) status = 'Slow';
        
        stats.push({ name: r.name || r.station_number, bookings: stationBkg, status });
     });
     return stats.sort((a,b) => b.bookings - a.bookings);
  }, [bookings, stations, totalBookings]);

  // Player Insights (New vs Returning)
  const guestInsights = useMemo(() => {
     let newG = 0, retG = 0;
     const contactCounts: Record<string, number> = {};
     bookings.forEach(b => {
       const key = b.phone || b.email || b.name; // Use whatever uniquely identifies player
       if (key) contactCounts[key] = (contactCounts[key] || 0) + 1;
     });
     Object.values(contactCounts).forEach(c => {
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
            <p className="text-sm text-muted-foreground mt-1">AI-powered intelligence and insights for your stations</p>
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
            { label: 'Hourly utilization', val: `${avgUtilization}%` },
            { label: 'Avg session length', val: `${avgSessionLength} hrs` }
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

        {/* Section 4 & 5 */}
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
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Walk-in %</p>
                    <p className="text-xl font-bold text-foreground">
                      {bookings.length > 0 ? `${Math.round((bookings.filter(b => b.booking_reference?.startsWith('OT-')).length / bookings.length) * 100)}%` : '0%'}
                    </p>
                  </div>
               </div>
             </div>
             <div>
               <h3 className="text-sm font-semibold text-foreground mb-4">Daily Sessions</h3>
               <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyCheckinsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.2} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide domain={[0, 'dataMax + 2']} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', backgroundColor: 'var(--card)' }}
                      />
                      <Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
             </div>
          </div>
          
        </div>

      </div>
    </AdminLayout>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, QrCode, CheckCircle2, AlertTriangle, RefreshCw, Send, LogOut, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import pb from '@/lib/pocketbase';

export default function WhatsAppSettings() {
  const [connected, setConnected] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  
  // Test Message Form State
  const [testPhone, setTestPhone] = useState<string>('');
  const [testText, setTestText] = useState<string>('🎮 GameZ Lounge WhatsApp test message - System is online!');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  
  const { toast } = useToast();

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status', {
        headers: {
          'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        setPhone(data.phone);
        setQrCode(data.qr);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // 5s REST polling contract
    return () => clearInterval(interval);
  }, []);

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
        },
      });
      if (res.ok) {
        toast({
          title: 'Disconnected',
          description: 'WhatsApp Web session unpaired successfully.',
        });
        fetchStatus();
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect WhatsApp session.',
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !testText) return;

    try {
      setSendingTest(true);
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
        },
        body: JSON.stringify({
          phone: testPhone,
          text: testText,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Test Message Sent! 🚀',
          description: `WhatsApp message dispatched to ${testPhone}`,
        });
        setTestPhone('');
      } else {
        toast({
          title: 'Failed to Send',
          description: data.error || 'Failed to send WhatsApp message.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to dispatch test message.',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">WhatsApp Business Integration</h1>
            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 gap-1 text-xs font-bold">
              <Zap className="w-3 h-3" /> Native Go Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pair your lounge's WhatsApp Business phone to dispatch instant tickets, blackout alerts, and session reminders with 0 third-party fees.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading} className="rounded-xl gap-2 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Status & QR Card */}
        <Card className="md:col-span-6 rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="border-b border-border bg-secondary/30 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl border ${connected ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/15 text-amber-500 border-amber-500/30'}`}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground font-bold">Connection Status</CardTitle>
                  <CardDescription className="text-xs">Official Multi-Device WhatsApp Web Pairing</CardDescription>
                </div>
              </div>
              <Badge className={`px-3 py-1 rounded-full font-bold text-xs gap-1.5 ${connected ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-600 border border-rose-500/30'}`}>
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {connected ? 'CONNECTED' : 'DISCONNECTED'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-center items-center text-center">
            {connected ? (
              <div className="space-y-4 py-4 w-full">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">WhatsApp Paired & Ready!</h3>
                  <p className="text-xs text-muted-foreground mt-1">Paired Phone Number:</p>
                  <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +{phone || '91XXXXXXXXXX'}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/50 border border-border text-left space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Active Zero-Fee Notification Engine
                  </div>
                  <div>• Automatic fallback to Cyber Email if phone loses signal.</div>
                  <div>• Rate-limited 1.5s pacing to keep WhatsApp account 100% safe.</div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" /> Disconnect & Unpair Session
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-2 w-full flex flex-col items-center">
                {qrCode ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-2xl border border-border inline-block shadow-md">
                      <img src={qrCode} alt="WhatsApp QR Code" className="w-52 h-52 object-contain mx-auto" />
                    </div>
                    <p className="text-xs font-semibold text-amber-500 flex items-center justify-center gap-1">
                      <QrCode className="w-3.5 h-3.5" /> Scan QR code with WhatsApp Linked Devices
                    </p>
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-2">
                    <RefreshCw className="w-8 h-8 text-muted-foreground/40 mx-auto animate-spin" />
                    <p className="text-xs text-muted-foreground font-medium">Generating fresh WhatsApp QR code...</p>
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground bg-secondary/40 p-3 rounded-xl border border-border max-w-sm text-left">
                  <span className="font-bold text-foreground">How to pair:</span> Open WhatsApp on your lounge phone → Tap <b>Menu / Settings</b> → <b>Linked Devices</b> → <b>Link a Device</b> → Scan QR code above.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Test Dispatcher & Notification Rules */}
        <div className="md:col-span-6 space-y-6 flex flex-col">
          {/* Test Dispatcher Card */}
          <Card className="rounded-3xl border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border bg-secondary/30 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-foreground font-bold">Send Test WhatsApp</CardTitle>
                  <CardDescription className="text-xs">Verify instant WhatsApp delivery to any phone number</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSendTestMessage} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Recipient Phone Number</label>
                  <Input
                    placeholder="e.g. 9876543210"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    required
                    className="rounded-xl border-border bg-background text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Enter 10-digit Indian phone number (91 prefix is added automatically).</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Test Message</label>
                  <Textarea
                    rows={3}
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    required
                    className="rounded-xl border-border bg-background text-xs resize-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!connected || sendingTest || !testPhone}
                  className="w-full rounded-xl font-semibold text-xs gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingTest ? 'Sending WhatsApp Test...' : 'Send Test WhatsApp Message'}
                </Button>
                {!connected && (
                  <p className="text-[11px] text-amber-500 font-semibold text-center flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Pair WhatsApp device above to enable test messaging.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Automated System Triggers */}
          <Card className="rounded-3xl border border-border bg-card shadow-sm flex-1">
            <CardHeader className="border-b border-border bg-secondary/30 pb-3">
              <CardTitle className="text-sm font-bold text-foreground">Automated System Triggers</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-secondary/30 border border-border">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold shrink-0">🎟️</span>
                <div>
                  <div className="font-bold text-foreground">Instant Booking Confirmation</div>
                  <div className="text-[11px] text-muted-foreground">Dispatches digital ticket ref, station, and time slot immediately upon paid booking.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-secondary/30 border border-border">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 font-bold shrink-0">⚠️</span>
                <div>
                  <div className="font-bold text-foreground">Blackout & Store Closure Alerts</div>
                  <div className="text-[11px] text-muted-foreground">Sends refund notice & 1-click reschedule link when store closures are scheduled.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

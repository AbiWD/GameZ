import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, QrCode, CheckCircle2, AlertTriangle, RefreshCw, Send, LogOut, ShieldCheck, Smartphone, Zap, Building2 } from 'lucide-react';
import pb from '@/lib/pocketbase';

const WhatsAppLogo = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg className={`fill-current ${className}`} viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function WhatsAppSettings() {
  const [connected, setConnected] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(false);
  
  // Test Message Form State
  const [testPhone, setTestPhone] = useState<string>('');
  const [testText, setTestText] = useState<string>('🎮 GameZ Lounge WhatsApp test message - System is online!');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  
  const { toast } = useToast();

  const handleGenerateQr = async () => {
    setShowQr(true);
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/qr', {
        method: 'POST',
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
      console.error('Failed to generate QR:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async (isManual = false) => {
    if (isManual) setLoading(true);
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
        if (data.connected) {
          setShowQr(false);
        }
        if (isManual) {
          toast({
            title: "Status Refreshed 🔄",
            description: data.connected ? `Connected to ${data.phone || 'WhatsApp'}` : "WhatsApp connection checked.",
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(false);
    const interval = setInterval(() => fetchStatus(false), 5000); // 5s REST polling contract
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
          title: "WhatsApp Disconnected",
          description: "Lounge WhatsApp session logged out successfully.",
        });
        setShowQr(false);
        fetchStatus(false);
      } else {
        toast({
          title: "Disconnect Failed",
          description: "Failed to disconnect WhatsApp session.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while disconnecting.",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast({
        title: "Missing Phone",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

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
          message: testText,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.success || data.status === "test_message_sent")) {
        toast({
          title: "WhatsApp Message Sent! 🚀",
          description: `Test ticket message dispatched to ${testPhone}`,
        });
      } else {
        toast({
          title: "Delivery Failed",
          description: data.error || "Failed to deliver WhatsApp test message.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while sending test message.",
        variant: "destructive",
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <WhatsAppLogo className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-500 flex-shrink-0" />
              <span>WhatsApp Business Integration</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Pair your lounge's WhatsApp Business phone to dispatch instant tickets, blackout alerts, and session reminders
            </p>
          </div>
          <Button variant="outline" onClick={() => fetchStatus(true)} disabled={loading} size="sm" className="w-full sm:w-auto self-start sm:self-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        {/* Strict WhatsApp Business Warning Callout */}
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5 shadow-sm">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-amber-700 dark:text-amber-400 text-sm sm:text-base tracking-tight">
                Mandatory Requirement: WhatsApp Business Account Only
              </h3>
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10">
                Official Business Policy
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Please pair <strong className="text-foreground font-semibold">only your lounge's official WhatsApp Business account</strong>. Personal WhatsApp accounts must not be connected to prevent automated dispatch rate limits, spam flags, and Meta terms non-compliance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status & QR Scanner Card */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Connection Status
                </CardTitle>
                <CardDescription>
                  Official Multi-Device WhatsApp Web Pairing
                </CardDescription>
              </div>
              <Badge variant={connected ? "default" : "destructive"} className={connected ? "bg-emerald-500 text-white hover:bg-emerald-600" : ""}>
                {connected ? (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> CONNECTED
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-white" /> DISCONNECTED
                  </span>
                )}
              </Badge>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {connected ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-6 text-center space-y-4 max-w-full overflow-hidden">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-emerald-400 text-base sm:text-lg">Lounge WhatsApp Active</h3>
                    <p className="text-xs text-muted-foreground break-all">
                      Paired Phone: <span className="font-mono text-foreground font-semibold inline-block">{phone || 'Registered'}</span>
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleDisconnect} 
                      disabled={disconnecting}
                      className="w-full sm:w-auto max-w-full text-xs sm:text-sm py-2 px-4 h-auto whitespace-normal"
                    >
                      <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{disconnecting ? 'Disconnecting...' : 'Disconnect Lounge WhatsApp'}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 sm:p-6 border border-dashed border-border/80 rounded-xl bg-background/50 space-y-4 w-full">
                  {!showQr ? (
                    <div className="w-full max-w-[224px] h-56 rounded-xl bg-card border-2 border-dashed border-emerald-500/40 flex flex-col items-center justify-center p-4 text-center space-y-3 shadow-inner">
                      <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                        <QrCode className="h-8 w-8" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">WhatsApp Account Disconnected</p>
                      <Button
                        onClick={handleGenerateQr}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-md gap-1.5 w-full"
                      >
                        <QrCode className="h-4 w-4" />
                        Generate QR Code
                      </Button>
                    </div>
                  ) : qrCode ? (
                    <>
                      <div className="p-3 bg-white rounded-xl shadow-lg border border-gray-200 max-w-full">
                        <img src={qrCode} alt="WhatsApp Pairing QR Code" className="w-48 h-48 sm:w-56 sm:h-56 object-contain" />
                      </div>
                      <div className="text-center space-y-2 w-full">
                        <p className="text-sm font-semibold flex items-center justify-center gap-1 text-primary">
                          <QrCode className="h-4 w-4" /> Scan with WhatsApp Linked Devices
                        </p>
                        <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={handleGenerateQr} className="text-xs">
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh QR Code
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setShowQr(false)} className="text-xs text-muted-foreground">
                            Hide QR Code
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full max-w-[224px] h-56 rounded-xl bg-card border border-border flex flex-col items-center justify-center p-4 text-center space-y-3">
                      <RefreshCw className="h-7 w-7 animate-spin mx-auto text-emerald-500" />
                      <p className="text-xs text-muted-foreground font-medium">Generating WhatsApp QR code...</p>
                      <Button variant="outline" size="sm" onClick={handleGenerateQr} className="text-xs mt-1">
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Generation
                      </Button>
                    </div>
                  )}

                  <div className="w-full text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40 space-y-1">
                    <p className="font-medium text-foreground">How to pair:</p>
                    <p>Open 'WhatsApp' on your lounge phone → Tap Menu / Settings → Linked Devices → Link a Device → Scan QR code above.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Dispatcher Card */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-400" />
                Send Test WhatsApp
              </CardTitle>
              <CardDescription>
                Verify instant WhatsApp delivery to any phone number
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendTestMessage} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recipient Phone Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">Enter 10-digit Indian phone number (+91 is added automatically).</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Test Message
                  </label>
                  <Textarea
                    rows={3}
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    className="font-sans text-sm"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={sendingTest || !connected}>
                  <Send className="h-4 w-4 mr-2" />
                  {sendingTest ? 'Sending...' : 'Send Test WhatsApp Message'}
                </Button>

                {!connected && (
                  <p className="text-xs text-amber-500/90 text-center flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Pair WhatsApp device above to enable test messaging.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Feature Overview Info Card */}
        <Card className="border-border/50 bg-card/40">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Automated System Triggers</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Instant Booking Confirmation
              </span>
              <p>Dispatches digital ticket ref, station, and time slot immediately upon paid booking.</p>
            </div>
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Blackout & Store Closure Alerts
              </span>
              <p>Sends refund notice & 1-click reschedule link when store closures are scheduled.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

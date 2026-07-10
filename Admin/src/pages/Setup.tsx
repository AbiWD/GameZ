import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Gamepad2, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import pb from "@/lib/pocketbase";

const Setup = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkSetupStatus, isSetupRequired } = useAuth();
  
  useEffect(() => {
    // If we definitely know setup is not required, boot them out
    if (isSetupRequired === false) {
      navigate("/auth");
    }
  }, [isSetupRequired, navigate]);

  const [formData, setFormData] = useState({
    name: "",
    cafeName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: "Passwords do not match.",
      });
      return;
    }

    setLoading(true);
    try {
      // Direct API call to our custom pb_hook endpoint
      const response = await fetch(`/api/gamez/setup-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to initialize setup.");
      }

      toast({
        title: "Setup Complete! 🎉",
        description: "Your master admin account has been created.",
      });

      // Update auth state so app knows setup is done
      await checkSetupStatus();
      
      // Navigate to auth so user can login with new credentials
      navigate("/auth");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: error.message || "Something went wrong during setup.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="w-full max-w-lg bg-card rounded-3xl p-10 shadow-xl border border-border">
        <div className="flex justify-center mb-6">
          <div className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg">
            <Gamepad2 className="w-8 h-8" />
          </div>
        </div>
        
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome to GameZ</h1>
          <p className="text-muted-foreground font-medium text-sm">
            It looks like this is a fresh installation. Let's create your master admin account to get started.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-bold ml-1 text-muted-foreground">Your Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                required 
                value={formData.name}
                onChange={handleChange}
                className="rounded-xl bg-secondary border border-border px-5 py-6 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cafeName" className="text-sm font-bold ml-1 text-muted-foreground">Cafe Name</Label>
              <Input 
                id="cafeName" 
                placeholder="GameZ Main Branch" 
                required 
                value={formData.cafeName}
                onChange={handleChange}
                className="rounded-xl bg-secondary border border-border px-5 py-6 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-bold ml-1 text-muted-foreground">Admin Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="admin@gamez.in" 
              required 
              value={formData.email}
              onChange={handleChange}
              className="rounded-xl bg-secondary border border-border px-5 py-6 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-bold ml-1 text-muted-foreground">Secure Password</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                required 
                minLength={8}
                value={formData.password}
                onChange={handleChange}
                className={`rounded-xl bg-secondary border border-border px-5 py-6 pr-12 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground ${!showPassword ? 'tracking-widest' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-bold ml-1 text-muted-foreground">Confirm Password</Label>
            <div className="relative">
              <Input 
                id="confirmPassword" 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="••••••••" 
                required 
                minLength={8}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`rounded-xl bg-secondary border border-border px-5 py-6 pr-12 font-medium text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 placeholder:text-muted-foreground ${!showConfirmPassword ? 'tracking-widest' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <Button type="submit" className="w-full rounded-full bg-primary hover:bg-primary/90 px-8 py-7 h-auto text-primary-foreground font-bold text-lg shadow-lg shadow-primary/10 mt-6 transition-all active:scale-[0.98]" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                Complete Setup <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Setup;

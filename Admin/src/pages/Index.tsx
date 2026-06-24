import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold">Dream House Homestay</h1>
        <p className="text-xl text-muted-foreground">Admin Dashboard</p>
        <Button onClick={() => navigate('/auth')} size="lg">
          Access Admin Panel
        </Button>
      </div>
    </div>
  );
};

export default Index;

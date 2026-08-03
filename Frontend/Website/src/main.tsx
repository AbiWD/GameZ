import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { EmailProvider } from './context/EmailContext';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EmailProvider>
          <App />
        </EmailProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

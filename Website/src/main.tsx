import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthAndBookingProvider } from './context/AuthAndBookingContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthAndBookingProvider>
      <App />
    </AuthAndBookingProvider>
  </StrictMode>,
);

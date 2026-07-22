import React, { createContext, useContext, useState } from 'react';

export interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
}

interface NotificationContextType {
  emails: SimulatedEmail[];
  activeNotification: SimulatedEmail | null;
  dispatchEmail: (to: string, subject: string, body: string) => void;
  dismissNotification: () => void;
  clearAllEmails: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [activeNotification, setActiveNotification] = useState<SimulatedEmail | null>(null);

  const dispatchEmail = (to: string, subject: string, body: string) => {
    const newEmail: SimulatedEmail = {
      id: 'email-' + Date.now() + Math.random().toString(36).substr(2, 5),
      to,
      subject,
      body,
      timestamp: Date.now(),
      read: false
    };
    setEmails(prev => [newEmail, ...prev]);
    setActiveNotification(newEmail);
  };

  const dismissNotification = () => {
    setActiveNotification(null);
  };

  const clearAllEmails = () => {
    setEmails([]);
    setActiveNotification(null);
  };

  return (
    <NotificationContext.Provider value={{
      emails,
      activeNotification,
      dispatchEmail,
      dismissNotification,
      clearAllEmails
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

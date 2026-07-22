import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

interface EmailContextType {
  emails: EmailMessage[];
  activeNotification: EmailMessage | null;
  dispatchEmailNotification: (to: string, subject: string, body: string) => void;
  dismissNotification: () => void;
  clearAllEmails: () => void;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export const EmailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [activeNotification, setActiveNotification] = useState<EmailMessage | null>(null);

  const dispatchEmailNotification = (to: string, subject: string, body: string) => {
    const newEmail: EmailMessage = {
      id: Math.random().toString(36).substring(2, 9),
      to,
      subject,
      body,
      timestamp: new Date().toISOString()
    };
    
    setEmails(prev => [newEmail, ...prev]);
    setActiveNotification(newEmail);

    // Auto-dismiss the toast after 12 seconds
    setTimeout(() => {
      setActiveNotification(current => 
        current?.id === newEmail.id ? null : current
      );
    }, 12000);
  };

  const dismissNotification = () => {
    setActiveNotification(null);
  };

  const clearAllEmails = () => {
    setEmails([]);
    setActiveNotification(null);
  };

  return (
    <EmailContext.Provider
      value={{
        emails,
        activeNotification,
        dispatchEmailNotification,
        dismissNotification,
        clearAllEmails
      }}
    >
      {children}
    </EmailContext.Provider>
  );
};

export const useEmail = () => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmail must be used within an EmailProvider');
  }
  return context;
};

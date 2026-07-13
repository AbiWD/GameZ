import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, X, Check, Bell, Inbox, AlertTriangle } from 'lucide-react';
import { useAuthAndBooking } from '../context/AuthAndBookingContext';

export const EmailNotificationBanner: React.FC = () => {
  const { activeNotification, dismissNotification, emails, clearAllEmails } = useAuthAndBooking();
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  return (
    <>
      {/* 1. TOAST NOTIFICATION ON NEW EMAIL DISPATCH */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[120] max-w-sm w-full bg-cyber-lightgray border-2 border-cyber-cyan/50 rounded-2xl p-4 shadow-[0_10px_30px_rgba(6,182,212,0.15)] overflow-hidden"
          >
            {/* Left glowing border tag */}
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-cyber-cyan" />
            
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20">
                <Mail className="h-5 w-5 animate-bounce" />
              </div>

              <div className="flex-1 space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-extrabold uppercase tracking-widest text-cyber-cyan">
                    📧 SIMULATED EMAIL DISPATCHED
                  </span>
                  <button
                    onClick={dismissNotification}
                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h4 className="font-display text-xs font-bold text-white truncate">
                  {activeNotification.subject}
                </h4>
                <p className="text-[11px] text-gray-400 font-sans">
                  Sent to: <span className="text-gray-300 font-mono text-[10px]">{activeNotification.to}</span>
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsInboxOpen(true);
                      setExpandedEmailId(activeNotification.id);
                      dismissNotification();
                    }}
                    className="px-2.5 py-1 rounded bg-cyber-cyan/20 text-[10px] font-mono text-cyber-cyan border border-cyber-cyan/30 hover:bg-cyber-cyan/35 transition cursor-pointer"
                  >
                    Open Simulated Mail
                  </button>
                  <button
                    onClick={dismissNotification}
                    className="px-2.5 py-1 text-[10px] font-mono text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. FLOATING INBOX TOGGLER BUTTON */}
      <div className="fixed bottom-6 left-6 z-[90]">
        <button
          onClick={() => setIsInboxOpen(true)}
          className="relative group p-4 rounded-full bg-cyber-lightgray border border-cyber-purple/40 text-cyber-purple shadow-xl hover:scale-105 active:scale-95 hover:border-cyber-cyan hover:text-cyber-cyan hover:shadow-cyber-cyan/10 transition-all duration-300 cursor-pointer"
          title="Open Simulated Mail Inbox"
        >
          <Inbox className="h-6 w-6" />
          {emails.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyber-pink text-[10px] font-mono font-bold text-white animate-pulse">
              {emails.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. SIMULATED EMAIL INBOX DRAWER DIALOG */}
      <AnimatePresence>
        {isInboxOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-end">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsInboxOpen(false)}
            />

            {/* Sidebar drawer content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-full max-w-md h-full bg-cyber-gray border-l border-white/5 shadow-2xl flex flex-col justify-stretch p-6"
            >
              {/* Glowing header line */}
              <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-gradient-to-b from-cyber-purple to-cyber-cyan" />

              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <div className="flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-cyber-cyan" />
                  <div>
                    <h3 className="font-display text-base font-extrabold text-white">Simulated Mail Inbox</h3>
                    <p className="text-[10px] font-mono text-gray-500">Live system email dispatch debugger</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {emails.length > 0 && (
                    <button
                      onClick={clearAllEmails}
                      className="text-[10px] font-mono text-cyber-pink hover:underline focus:outline-none"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setIsInboxOpen(false)}
                    className="p-1.5 rounded bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Email Content Area */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {emails.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500 space-y-2">
                    <Mail className="h-8 w-8 text-gray-600 animate-pulse" />
                    <p className="text-xs font-mono">No simulation emails dispatched yet.</p>
                    <p className="text-[10px] max-w-[240px] text-gray-600 font-sans">
                      Dispatched verification slips, account welcomes, and cancellation receipt emails will show up here.
                    </p>
                  </div>
                ) : (
                  emails.map((email) => {
                    const isExpanded = expandedEmailId === email.id;
                    return (
                      <div
                        key={email.id}
                        className={`p-3.5 rounded-xl border transition-all duration-200 ${
                          isExpanded 
                            ? 'bg-cyber-lightgray/80 border-cyber-cyan/40' 
                            : 'bg-cyber-lightgray/30 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div 
                          className="flex justify-between items-start cursor-pointer"
                          onClick={() => setExpandedEmailId(isExpanded ? null : email.id)}
                        >
                          <div className="space-y-1 flex-1 min-w-0 pr-2">
                            <span className="block text-[9px] font-mono text-gray-500 uppercase">
                              {new Date(email.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <h4 className="font-display text-xs font-bold text-white truncate">
                              {email.subject}
                            </h4>
                            <p className="text-[10px] text-gray-400 truncate">
                              To: <span className="text-gray-300 font-mono">{email.to}</span>
                            </p>
                          </div>
                          <span className={`text-[10px] font-mono ${isExpanded ? 'text-cyber-cyan' : 'text-gray-500'}`}>
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </span>
                        </div>

                        {/* Expanded Body */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1, marginTop: '12px' }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-white/5 pt-3"
                            >
                              <div className="bg-black/40 rounded-xl p-3 font-mono text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap break-words select-all selection:bg-cyber-cyan/35 selection:text-white">
                                {email.body}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    );
                  })
                )}
              </div>

              {/* Debug Footer explanation */}
              <div className="p-4 rounded-xl bg-cyber-dark/40 border border-white/5 mt-4 text-[11px] text-gray-400 leading-normal flex items-start gap-2 select-none">
                <AlertTriangle className="h-4 w-4 text-cyber-cyan shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-mono">Sandbox Notice:</strong> This inbox captures all automated outgoing emails in local storage to keep your playground experience entirely secure and independent.
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const fs = require('fs');
let content = fs.readFileSync('src/pages/Book.tsx', 'utf8');

const replacement = `          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div 
                className="mt-8 text-center bg-cyber-darker border border-white/5 rounded-3xl p-8 sm:p-12 relative overflow-hidden"
                style={{
                  boxShadow: '0 0 40px -10px rgba(139, 92, 246, 0.1), inset 0 0 20px -10px rgba(6, 182, 212, 0.05)'
                }}
              >
                {!holdExpired ? (
                  <>
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-purple/10 text-cyber-purple border border-cyber-purple mb-2 animate-pulse">
                      <Clock className="h-8 w-8" />
                    </div>
                    
                    <div className="space-y-2">
                      <span className="font-mono text-xs text-cyber-purple uppercase font-bold tracking-widest block">
                        TEMPORARY RESERVATION LOCK ACTIVATED
                      </span>
                      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                        Your Hold Expires In:
                      </h1>
                    </div>

                    {/* Gigantic Count Clock */}
                    <div className="font-mono text-5xl sm:text-6xl font-extrabold text-cyber-cyan bg-cyber-lightgray border border-white/5 py-6 px-8 rounded-2xl tracking-wider inline-block">
                      {formatTimer(holdTimer)}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
                      We have temporarily locked your selected table/console. Complete the reservation check-in before the timer hits zero to secure your verification pass.
                    </p>

                    {/* Summary Box */}
                    <div className="p-5 rounded-xl bg-cyber-dark/40 border border-white/5 text-left text-xs space-y-2 max-w-sm mx-auto">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reserved Station:</span>
                        <span className="text-white font-semibold">{selectedStation?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Time Slot:</span>
                        <span className="text-white font-mono font-semibold">{bookingDate} &bull; {startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fee Amount:</span>
                        <span className="text-cyber-neon font-mono font-semibold">₹{(selectedStation?.ratePerHour || 0) * durationHours}</span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4">
                      <button
                        id="step-4-cancel-btn"
                        onClick={handleCancelOrReset}
                        className="px-5 py-3 text-xs font-display font-semibold text-gray-400 hover:text-white transition focus:outline-none"
                      >
                        Release Hold
                      </button>
                      <button
                        id="step-4-confirm-btn"
                        onClick={handleConfirmReservation}
                        className="flex items-center gap-1.5 px-8 py-3.5 bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white font-display font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-cyber-purple/10 hover:scale-[1.02] active:scale-[0.98] transition focus:outline-none focus:ring-2 focus:ring-cyber-cyan cursor-pointer"
                      >
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        Confirm Reservation
                      </button>
                    </div>
                  </>
                ) : (
                  // Expired State
                  <div className="space-y-6">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-pink/10 text-cyber-pink border border-cyber-pink mb-2">
                      <ShieldAlert className="h-8 w-8" />
                    </div>

                    <div className="space-y-2">
                      <span className="font-mono text-xs text-cyber-pink uppercase font-bold tracking-widest block">
                        HOLD PERIOD EXPIRED
                      </span>
                      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                        Reservation Released
                      </h1>
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
                      The 5-minute lock on your selected station expired. Please reset the wizard to check current real-time table availability and secure a new lock.
                    </p>

                    <div className="pt-6">
                      <button
                        id="step-4-expired-retry-btn"
                        onClick={handleCancelOrReset}
                        className="flex items-center gap-2 px-8 py-3.5 bg-cyber-purple text-white font-display font-bold text-sm tracking-wide rounded-xl shadow-md hover:bg-cyber-purple/80 transition-all mx-auto cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Try New Reservation Lock
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

`;

const startIdx = content.indexOf('{step === 4 && (');
const endIdx = content.indexOf('{/* STEP 5: FINAL CONFIRMED RECEIPT */}');

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + replacement + '          ' + content.substring(endIdx);
  fs.writeFileSync('src/pages/Book.tsx', content);
  console.log("Success");
} else {
  console.log("Could not find blocks");
}

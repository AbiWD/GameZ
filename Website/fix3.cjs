const fs = require('fs');

const file = 'src/pages/Book.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /<span className="font-mono text-xs text-cyber-purple uppercase font-bold tracking-widest block">\s*TEMPORARY RESERVATION LOCK ACTIVATED\s*<\/span>[\s\S]*?\)\s*:\s*\(\s*\/\/\s*Expired State/g;

const replacement = `<span className="font-mono text-xs text-cyber-purple uppercase font-bold tracking-widest block">
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
                // Expired State`;

if (targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(file, content);
    console.log("Success! File replaced via regex.");
} else {
    console.log("Target Regex not matched.");
}

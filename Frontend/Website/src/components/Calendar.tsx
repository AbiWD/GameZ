"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const calendarVariants = cva(
  "inline-block space-y-4 rounded-xl border border-white/10 bg-cyber-dark relative w-full max-w-sm mx-auto shadow-[0_0_20px_rgba(139,92,246,0.15)]",
  {
    variants: {
      size: {
        sm: "p-2 sm:p-3 text-sm",
        default: "p-3 sm:p-4",
        lg: "p-4 sm:p-5 text-base",
      },
      alwaysOnTop: {
        true: "z-50",
        false: "z-10",
      },
    },
    defaultVariants: {
      size: "default",
      alwaysOnTop: true,
    },
  }
);

const dayVariants = cva(
  "inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer font-mono",
  {
    variants: {
      variant: {
        default:
          "text-gray-300 hover:bg-cyber-purple/20 hover:text-white focus-visible:ring-cyber-purple",
        selected:
          "bg-cyber-purple text-white hover:bg-cyber-purple/90 focus-visible:ring-cyber-purple font-extrabold shadow-[0_0_15px_rgba(139,92,246,0.6)]",
        today:
          "bg-cyber-cyan text-cyber-dark font-extrabold hover:bg-cyber-cyan/80 focus-visible:ring-cyber-cyan shadow-[0_0_15px_rgba(34,211,238,0.6)]",
        outside:
          "text-gray-600 opacity-50 hover:bg-cyber-purple/20 hover:text-white focus-visible:ring-cyber-purple",
        disabled:
          "text-gray-600 opacity-30 cursor-not-allowed",
        "range-start":
          "bg-cyber-purple text-white rounded-r-none hover:bg-cyber-purple/90",
        "range-end":
          "bg-cyber-purple text-white rounded-l-none hover:bg-cyber-purple/90",
        "range-middle":
          "bg-cyber-purple/20 text-white rounded-none hover:bg-cyber-purple/30",
      },
      size: {
        sm: "h-6 w-6 sm:h-7 sm:w-7 text-xs",
        default: "h-9 w-9 text-sm",
        lg: "h-10 w-10 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface CalendarProps extends VariantProps<typeof calendarVariants> {
  selected?: Date;
  onSelect?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  locale?: string;
  className?: string;
  showOutsideDays?: boolean;
  minDate?: Date;
  maxDate?: Date;
  mode?: "single" | "multiple" | "range";
  selectedDates?: Date[];
  selectedRange?: { from: Date; to?: Date };
  onSelectMultiple?: (dates: Date[]) => void;
  onSelectRange?: (range: { from: Date; to?: Date }) => void;
  showMonthYearPickers?: boolean;
  alwaysOnTop?: boolean;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function Calendar({
  selected,
  onSelect,
  disabled,
  locale = "en-US",
  className,
  size,
  showOutsideDays = true,
  minDate,
  maxDate,
  mode = "single",
  selectedDates = [],
  selectedRange,
  onSelectMultiple,
  onSelectRange,
  showMonthYearPickers = false,
  alwaysOnTop = true,
  ...props
}: CalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(selected || new Date());
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [direction, setDirection] = React.useState<"left" | "right">("right");
  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  const prevMonthDays = Array.from(
    { length: firstDayOfWeek },
    (_, i) => prevMonthLastDay - firstDayOfWeek + i + 1
  );

  const totalCells = 42; 
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const remainingCells =
    totalCells - prevMonthDays.length - currentMonthDays.length;
  const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => i + 1);
  
  const navigateMonth = (direction: "prev" | "next") => {
    setIsAnimating(true);
    setDirection(direction === "prev" ? "left" : "right");

    setTimeout(() => {
      const newDate = new Date(currentDate);
      if (direction === "prev") {
        newDate.setMonth(currentMonth - 1);
      } else {
        newDate.setMonth(currentMonth + 1);
      }
      setCurrentDate(newDate);
      setIsAnimating(false);
    }, 150);
  };

  const isDateDisabled = (date: Date) => {
    if (disabled?.(date)) return true;
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };
  
  const isDateSelected = (date: Date) => {
    if (mode === "single") {
      return selected && isSameDay(date, selected);
    }
    return false;
  };

  const isToday = (date: Date) => isSameDay(date, today);

  const handleDateClick = (day: number, monthOffset: number = 0) => {
    const clickedDate = new Date(currentYear, currentMonth + monthOffset, day);

    if (isDateDisabled(clickedDate)) return;

    if (mode === "single") {
      onSelect?.(clickedDate);
    }
  };
  
  const getDayVariant = (
    day: number,
    monthOffset: number = 0
  ): "default" | "selected" | "today" | "outside" | "disabled" => {
    const date = new Date(currentYear, currentMonth + monthOffset, day);

    if (isDateDisabled(date)) return "disabled";
    if (isDateSelected(date)) return "selected";
    if (isToday(date)) return "today";
    if (monthOffset !== 0) return "outside";
    return "default";
  };

  const slideVariants = {
    enter: (direction: string) => ({
      x: direction === "right" ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: string) => ({
      zIndex: 0,
      x: direction === "right" ? -50 : 50,
      opacity: 0,
    }),
  };
  
  return (
    <div
      className={cn(calendarVariants({ size, alwaysOnTop }), className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateMonth("prev")}
          className="inline-flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-cyber-purple/20 text-gray-400 hover:text-white"
          disabled={isAnimating}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <motion.h2
              key={`${currentMonth}-${currentYear}`}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-bold text-cyber-cyan tracking-wider uppercase text-center px-2 font-mono"
            >
              {MONTHS[currentMonth]} {currentYear}
            </motion.h2>
        </div>

        <button
          onClick={() => navigateMonth("next")}
          className="inline-flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-cyber-purple/20 text-gray-400 hover:text-white"
          disabled={isAnimating}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mt-2">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center h-8 text-[0.8rem] text-gray-400 font-mono"
          >
            {day.slice(0, 3)}
          </div>
        ))}
      </div>
      
      <div className="relative overflow-hidden mt-1">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${currentMonth}-${currentYear}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 500, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="grid grid-cols-7 gap-1"
          >
            {showOutsideDays &&
              prevMonthDays.map((day) => (
                <button
                  key={`prev-${day}`}
                  onClick={() => handleDateClick(day, -1)}
                  className={cn(
                    dayVariants({ variant: getDayVariant(day, -1), size })
                  )}
                  disabled={isDateDisabled(
                    new Date(currentYear, currentMonth - 1, day)
                  )}
                >
                  {day}
                </button>
              ))}

            {currentMonthDays.map((day) => (
              <button
                key={`current-${day}`}
                onClick={() => handleDateClick(day)}
                className={cn(
                  dayVariants({ variant: getDayVariant(day), size })
                )}
                disabled={isDateDisabled(
                  new Date(currentYear, currentMonth, day)
                )}
              >
                {day}
              </button>
            ))}

            {showOutsideDays &&
              nextMonthDays.map((day) => (
                <button
                  key={`next-${day}`}
                  onClick={() => handleDateClick(day, 1)}
                  className={cn(
                    dayVariants({ variant: getDayVariant(day, 1), size })
                  )}
                  disabled={isDateDisabled(
                    new Date(currentYear, currentMonth + 1, day)
                  )}
                >
                  {day}
                </button>
              ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export { Calendar, calendarVariants, dayVariants, type CalendarProps };

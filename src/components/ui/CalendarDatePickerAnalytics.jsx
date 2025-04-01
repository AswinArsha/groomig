import React, { useState } from "react";
import { CalendarIcon } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  addDays
} from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

// Define the months array
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Setup a utility for variant classes
const multiSelectVariants = cva(
  "flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground text-background",
        link: "text-primary underline-offset-4 hover:underline text-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Timezone-adjusted utility functions for India (IST - UTC+5:30)
const INDIA_OFFSET = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds

// Gets the start of day in IST timezone
function startOfDayIST(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // No need to adjust for timezone since we're setting local time
  return d;
}

// Gets the end of day in IST timezone
function endOfDayIST(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  // No need to adjust for timezone since we're setting local time
  return d;
}

// Date range picker component
function CalendarDatePickerAnalytics({
  id = "calendar-date-picker",
  className,
  date, // Expected shape: { from: Date, to: Date }
  closeOnSelect = false,
  numberOfMonths = 2,
  yearsRange = 10,
  onDateSelect,
  variant,
  ...props
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState("This Year");
  const [monthFrom, setMonthFrom] = useState(date?.from || startOfMonth(new Date()));
  const [yearFrom, setYearFrom] = useState(date?.from ? date.from.getFullYear() : new Date().getFullYear());
  const [monthTo, setMonthTo] = useState(numberOfMonths === 2 ? (date?.to || endOfMonth(new Date())) : (date?.from || startOfMonth(new Date())));
  const [yearTo, setYearTo] = useState(
    numberOfMonths === 2
      ? date?.to
        ? date.to.getFullYear()
        : new Date().getFullYear()
      : date?.from
      ? date.from.getFullYear()
      : new Date().getFullYear()
  );
  const [highlightedPart, setHighlightedPart] = useState(null);

  // Current date in local timezone (India)
  const today = new Date();

  // Preset ranges with IST timezone adjustments
  const dateRanges = [
    { 
      label: "Today", 
      start: startOfDayIST(today), 
      end: endOfDayIST(today) 
    },
    { 
      label: "Yesterday", 
      start: startOfDayIST(subDays(today, 1)), 
      end: endOfDayIST(subDays(today, 1)) 
    },
    {
      label: "This Week",
      start: startOfDayIST(startOfWeek(today, { weekStartsOn: 1 })),
      end: endOfDayIST(endOfWeek(today, { weekStartsOn: 1 })),
    },
    {
      label: "Last Week",
      start: startOfDayIST(startOfWeek(subDays(today, 7), { weekStartsOn: 1 })),
      end: endOfDayIST(endOfWeek(subDays(today, 7), { weekStartsOn: 1 })),
    },
    { 
      label: "This Month", 
      start: startOfDayIST(startOfMonth(today)), 
      end: endOfDayIST(endOfMonth(today)) 
    },
    {
      label: "Last Month",
      start: startOfDayIST(startOfMonth(subDays(today, today.getDate()))),
      end: endOfDayIST(endOfMonth(subDays(today, today.getDate()))),
    },
    { 
      label: "This Year", 
      start: startOfDayIST(startOfYear(today)), 
      end: endOfDayIST(endOfYear(today)) 
    },
    {
      label: "Last Year",
      start: startOfDayIST(startOfYear(subDays(today, 365))),
      end: endOfDayIST(endOfYear(subDays(today, 365))),
    },
  ];

  const handleClose = () => setIsPopoverOpen(false);
  const handleTogglePopover = () => setIsPopoverOpen((prev) => !prev);

  // Updated to ensure proper time boundaries in IST
  const selectDateRange = (from, to, rangeLabel) => {
    // Use our timezone-adjusted functions for India
    const startDate = from;
    const endDate = to;
    
    // Log the selected range
    console.log(`Selected range: ${rangeLabel}`, {
      from: startDate.toISOString(),
      to: endDate.toISOString(),
      fromLocal: startDate.toString(),
      toLocal: endDate.toString()
    });
    
    onDateSelect({ from: startDate, to: endDate });
    setSelectedRange(rangeLabel);
    setMonthFrom(from);
    setYearFrom(from.getFullYear());
    setMonthTo(to);
    setYearTo(to.getFullYear());
    if (closeOnSelect) setIsPopoverOpen(false);
  };

  // Updated handler to ensure proper time boundaries
  const handleDateSelect = (range) => {
    if (range) {
      let from = startOfDayIST(range.from);
      let to = range.to ? endOfDayIST(range.to) : endOfDayIST(range.from);
      
      if (numberOfMonths === 1) {
        to = endOfDayIST(from);
      }
      
      onDateSelect({ from, to });
      setMonthFrom(from);
      setYearFrom(from.getFullYear());
      setMonthTo(to);
      setYearTo(to.getFullYear());
    }
    setSelectedRange(null);
  };

  // Updated to ensure proper time boundaries
  const handleMonthChange = (newMonthIndex, part) => {
    setSelectedRange(null);
    if (part === "both") {
      if (yearFrom !== undefined) {
        if (newMonthIndex < 0 || newMonthIndex > 11) return;
        const newMonth = new Date(yearFrom, newMonthIndex, 1);
        const from = startOfDayIST(startOfMonth(newMonth));
        const to = endOfDayIST(endOfMonth(newMonth));
        onDateSelect({ from, to });
        setMonthFrom(newMonth);
        setMonthTo(newMonth);
      }
    } else if (part === "from") {
      if (yearFrom !== undefined) {
        if (newMonthIndex < 0 || newMonthIndex > 11) return;
        const newMonth = new Date(yearFrom, newMonthIndex, 1);
        const from = startOfDayIST(startOfMonth(newMonth));
        const to = numberOfMonths === 2 ? endOfDayIST(endOfMonth(newMonth)) : endOfDayIST(from);
        onDateSelect({ from, to });
        setMonthFrom(newMonth);
      }
    } else {
      if (yearTo !== undefined) {
        if (newMonthIndex < 0 || newMonthIndex > 11) return;
        const newMonth = new Date(yearTo, newMonthIndex, 1);
        const from = startOfDayIST(startOfMonth(newMonth));
        const to = numberOfMonths === 2 ? endOfDayIST(endOfMonth(newMonth)) : endOfDayIST(from);
        onDateSelect({ from, to });
        setMonthTo(newMonth);
      }
    }
  };

  // Updated to ensure proper time boundaries
  const handleYearChange = (newYear, part) => {
    setSelectedRange(null);
    if (part === "both") {
      const newMonth = monthFrom ? new Date(newYear, monthFrom.getMonth(), 1) : new Date(newYear, 0, 1);
      const from = startOfDayIST(startOfMonth(newMonth));
      const to = endOfDayIST(endOfMonth(newMonth));
      onDateSelect({ from, to });
      setYearFrom(newYear);
      setYearTo(newYear);
      setMonthFrom(newMonth);
      setMonthTo(newMonth);
    } else if (part === "from") {
      const newMonth = monthFrom ? new Date(newYear, monthFrom.getMonth(), 1) : new Date(newYear, 0, 1);
      const from = startOfDayIST(startOfMonth(newMonth));
      const to = numberOfMonths === 2 ? endOfDayIST(endOfMonth(newMonth)) : endOfDayIST(from);
      onDateSelect({ from, to });
      setYearFrom(newYear);
      setMonthFrom(newMonth);
    } else {
      const newMonth = monthTo ? new Date(newYear, monthTo.getMonth(), 1) : new Date(newYear, 0, 1);
      const from = startOfDayIST(startOfMonth(newMonth));
      const to = numberOfMonths === 2 ? endOfDayIST(endOfMonth(newMonth)) : endOfDayIST(from);
      onDateSelect({ from, to });
      setYearTo(newYear);
      setMonthTo(newMonth);
    }
  };

  const years = Array.from({ length: yearsRange + 1 }, (_, i) =>
    new Date().getFullYear() - Math.floor(yearsRange / 2) + i
  );

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          className={cn("w-auto", multiSelectVariants({ variant, className }))}
          onClick={handleTogglePopover}
          {...props}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>
            {date?.from ? (
              date.to ? (
                <>
                  <span
                    id="firstDay"
                    className={cn("date-part", highlightedPart === "firstDay" && "underline font-bold")}
                    onMouseOver={() => setHighlightedPart("firstDay")}
                    onMouseLeave={() => setHighlightedPart(null)}
                  >
                    {format(date.from, "dd")}
                  </span>{" "}
                  <span
                    id="firstMonth"
                    className={cn("date-part", highlightedPart === "firstMonth" && "underline font-bold")}
                    onMouseOver={() => setHighlightedPart("firstMonth")}
                    onMouseLeave={() => setHighlightedPart(null)}
                  >
                    {format(date.from, "LLL")}
                  </span>
                  ,{" "}
                  <span
                    id="firstYear"
                    className={cn("date-part", highlightedPart === "firstYear" && "underline font-bold")}
                    onMouseOver={() => setHighlightedPart("firstYear")}
                    onMouseLeave={() => setHighlightedPart(null)}
                  >
                    {format(date.from, "yyyy")}
                  </span>
                  {numberOfMonths === 2 && date.to && (
                    <>
                      {" - "}
                      <span
                        id="secondDay"
                        className={cn("date-part", highlightedPart === "secondDay" && "underline font-bold")}
                        onMouseOver={() => setHighlightedPart("secondDay")}
                        onMouseLeave={() => setHighlightedPart(null)}
                      >
                        {format(date.to, "dd")}
                      </span>{" "}
                      <span
                        id="secondMonth"
                        className={cn("date-part", highlightedPart === "secondMonth" && "underline font-bold")}
                        onMouseOver={() => setHighlightedPart("secondMonth")}
                        onMouseLeave={() => setHighlightedPart(null)}
                      >
                        {format(date.to, "LLL")}
                      </span>
                      ,{" "}
                      <span
                        id="secondYear"
                        className={cn("date-part", highlightedPart === "secondYear" && "underline font-bold")}
                        onMouseOver={() => setHighlightedPart("secondYear")}
                        onMouseLeave={() => setHighlightedPart(null)}
                      >
                        {format(date.to, "yyyy")}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span
                    id="day"
                    className={cn("date-part", highlightedPart === "day" && "underline font-bold")}
                    onMouseOver={() => setHighlightedPart("day")}
                    onMouseLeave={() => setHighlightedPart(null)}
                  >
                    {format(date.from, "dd")}
                  </span>{" "}
                  <span
                    id="month"
                    className={cn("date-part", highlightedPart === "month" && "underline font-bold")}
                    onMouseOver={() => setHighlightedPart("month")}
                    onMouseLeave={() => setHighlightedPart(null)}
                  >
                    {format(date.from, "LLL")}
                  </span>
                  ,{" "}
                  <span
                    id="year"
                    className={cn("date-part", highlightedPart === "year" && "underline font-bold")}
                    onMouseOver={() => setHighlightedPart("year")}
                    onMouseLeave={() => setHighlightedPart(null)}
                  >
                    {format(date.from, "yyyy")}
                  </span>
                </>
              )
            ) : (
              <span>Pick a date</span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[80vw] md:w-auto p-2"
        align="center"
        avoidCollisions={false}
        onInteractOutside={handleClose}
        onEscapeKeyDown={handleClose}
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
          overflowX: "hidden"
        }}
      >
        <div className="flex flex-col md:flex-row gap-4 ">
          <div className="flex flex-row md:flex-col gap-2 md:gap-1 p-2 md:pr-4 overflow-x-auto md:overflow-x-visible border-b md:border-b-0 md:border-r border-foreground/10 md:min-w-[200px]">
            {dateRanges.map(({ label, start, end }) => (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start hover:bg-primary/90 hover:text-background",
                  selectedRange === label &&
                    "bg-primary text-background hover:bg-primary/90 hover:text-background"
                )}
                onClick={() => {
                  selectDateRange(start, end, label);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex flex-row gap-2 w-full md:w-auto justify-center">
                <Select
                  onValueChange={(value) => {
                    handleMonthChange(months.indexOf(value), window.innerWidth < 768 ? "both" : "from");
                    setSelectedRange(null);
                  }}
                  value={monthFrom ? months[monthFrom.getMonth()] : undefined}
                >
                  <SelectTrigger className="w-[122px] focus:ring-0 focus:ring-offset-0 font-medium hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, idx) => (
                      <SelectItem key={idx} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  onValueChange={(value) => {
                    handleYearChange(Number(value), window.innerWidth < 768 ? "both" : "from");
                    setSelectedRange(null);
                  }}
                  value={yearFrom ? yearFrom.toString() : undefined}
                >
                  <SelectTrigger className="w-[122px] focus:ring-0 focus:ring-offset-0 font-medium hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year, idx) => (
                      <SelectItem key={idx} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {numberOfMonths === 2 && window.innerWidth >= 768 && (
                <div className="flex flex-row gap-2 w-full md:w-auto justify-center">
                  <Select
                    onValueChange={(value) => {
                      handleMonthChange(months.indexOf(value), "to");
                      setSelectedRange(null);
                    }}
                    value={monthTo ? months[monthTo.getMonth()] : undefined}
                  >
                    <SelectTrigger className="w-[122px] focus:ring-0 focus:ring-offset-0 font-medium hover:bg-accent hover:text-accent-foreground">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, idx) => (
                        <SelectItem key={idx} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    onValueChange={(value) => {
                      handleYearChange(Number(value), "to");
                      setSelectedRange(null);
                    }}
                    value={yearTo ? yearTo.toString() : undefined}
                  >
                    <SelectTrigger className="w-[122px] focus:ring-0 focus:ring-offset-0 font-medium hover:bg-accent hover:text-accent-foreground">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year, idx) => (
                        <SelectItem key={idx} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex justify-center md:justify-start md:-ml-4 overflow-x-hidden">
              <Calendar
                mode="range"
                defaultMonth={monthFrom}
                month={monthFrom}
                onMonthChange={setMonthFrom}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={window.innerWidth < 768 ? 1 : numberOfMonths}
                showOutsideDays={false}
                className={className}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default CalendarDatePickerAnalytics;
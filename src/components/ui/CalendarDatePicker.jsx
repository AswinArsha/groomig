// src/components/CalendarDatePicker.jsx
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
  startOfDay,
  endOfDay,
} from "date-fns";
import { format } from "date-fns";
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

// This component receives a "date" prop as a DateRange object: { from: Date, to: Date }
// and an onDateSelect callback which is called with an object { from: Date, to: Date }
function CalendarDatePicker({
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
  const [selectedRange, setSelectedRange] = useState(numberOfMonths === 2 ? "This Year" : "Today");
  const [monthFrom, setMonthFrom] = useState(date?.from);
  const [yearFrom, setYearFrom] = useState(date?.from ? date.from.getFullYear() : new Date().getFullYear());
  const [monthTo, setMonthTo] = useState(numberOfMonths === 2 ? date?.to : date?.from);
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

  // Preset ranges 
  const today = new Date();
  const dateRanges = [
    { label: "Today", start: today, end: today },
    { label: "Yesterday", start: subDays(today, 1), end: subDays(today, 1) },
    {
      label: "This Week",
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(today, { weekStartsOn: 1 }),
    },
    {
      label: "Last Week",
      start: startOfWeek(subDays(today, 7), { weekStartsOn: 1 }),
      end: endOfWeek(subDays(today, 7), { weekStartsOn: 1 }),
    },
    { label: "This Month", start: startOfMonth(today), end: endOfMonth(today) },
    {
      label: "Last Month",
      start: startOfMonth(subDays(today, today.getDate())),
      end: endOfMonth(subDays(today, today.getDate())),
    },
    { label: "This Year", start: startOfYear(today), end: endOfYear(today) },
    {
      label: "Last Year",
      start: startOfYear(subDays(today, 365)),
      end: endOfYear(subDays(today, 365)),
    },
  ];

  const handleClose = () => setIsPopoverOpen(false);
  const handleTogglePopover = () => setIsPopoverOpen((prev) => !prev);

  // Remove extra time zone conversion – use the dates directly
  const selectDateRange = (from, to, rangeLabel) => {
    const startDate = startOfDay(from);
    const endDate = numberOfMonths === 2 ? endOfDay(to) : startDate;
    onDateSelect({ from: startDate, to: endDate });
    setSelectedRange(rangeLabel);
    setMonthFrom(from);
    setYearFrom(from.getFullYear());
    setMonthTo(to);
    setYearTo(to.getFullYear());
    if (closeOnSelect) setIsPopoverOpen(false);
  };

  const handleDateSelect = (range) => {
    if (range) {
      let from = startOfDay(range.from);
      let to = range.to ? endOfDay(range.to) : from;
      if (numberOfMonths === 1) {
        to = from;
      }
      onDateSelect({ from, to });
      setMonthFrom(from);
      setYearFrom(from.getFullYear());
      setMonthTo(to);
      setYearTo(to.getFullYear());
    }
    setSelectedRange(null);
  };

  const handleMonthChange = (newMonthIndex, part) => {
    setSelectedRange(null);
    if (part === "from") {
      if (yearFrom !== undefined) {
        if (newMonthIndex < 0 || newMonthIndex > 11) return;
        const newMonth = new Date(yearFrom, newMonthIndex, 1);
        // Always update using the start of the month
        const from = startOfMonth(newMonth);
        const to = numberOfMonths === 2 ? endOfMonth(newMonth) : from;
        onDateSelect({ from, to });
        setMonthFrom(newMonth);
      }
    } else {
      if (yearTo !== undefined) {
        if (newMonthIndex < 0 || newMonthIndex > 11) return;
        const newMonth = new Date(yearTo, newMonthIndex, 1);
        const from = startOfMonth(newMonth);
        const to = numberOfMonths === 2 ? endOfMonth(newMonth) : from;
        onDateSelect({ from, to });
        setMonthTo(newMonth);
      }
    }
  };

  const handleYearChange = (newYear, part) => {
    setSelectedRange(null);
    if (part === "from") {
      const newMonth = monthFrom ? new Date(newYear, monthFrom.getMonth(), 1) : new Date(newYear, 0, 1);
      const from = startOfMonth(newMonth);
      const to = numberOfMonths === 2 ? endOfMonth(newMonth) : from;
      onDateSelect({ from, to });
      setYearFrom(newYear);
      setMonthFrom(newMonth);
    } else {
      const newMonth = monthTo ? new Date(newYear, monthTo.getMonth(), 1) : new Date(newYear, 0, 1);
      const from = startOfMonth(newMonth);
      const to = numberOfMonths === 2 ? endOfMonth(newMonth) : from;
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
        className="w-auto"
        align="center"
        avoidCollisions={false}
        onInteractOutside={handleClose}
        onEscapeKeyDown={handleClose}
        style={{
          maxHeight: "var(--radix-popover-content-available-height)",
          overflowY: "auto",
        }}
      >
        <div className="flex">
          {numberOfMonths === 2 && (
            <div className="hidden md:flex flex-col gap-1 pr-4 text-left border-r border-foreground/10">
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
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-4">
              <div className="flex gap-2 ml-3">
                <Select
                  onValueChange={(value) => {
                    handleMonthChange(months.indexOf(value), "from");
                    setSelectedRange(null);
                  }}
                  value={monthFrom ? months[monthFrom.getMonth()] : undefined}
                >
                  {/* Removed "hidden" so the select is always visible */}
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
                    handleYearChange(Number(value), "from");
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
              {numberOfMonths === 2 && (
                <div className="flex gap-2">
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
            <div className="flex">
              <Calendar
                mode="range"
                defaultMonth={monthFrom}
                month={monthFrom}
                onMonthChange={setMonthFrom}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={numberOfMonths}
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

export default CalendarDatePicker;
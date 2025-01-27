// src/components/Bookings/TimePicker.jsx
import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function TimePicker({ onTimeSelect, initialTime }) {
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");
  const [isPM, setIsPM] = useState(false);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  // Parse initialTime ("HH:MM:SS") to set hour, minute, isPM
  useEffect(() => {
    if (initialTime) {
      const [hoursInt, minutesInt, _seconds] = initialTime.split(":").map(Number);
      let displayHour = hoursInt % 12 === 0 ? 12 : hoursInt % 12;
      setHour(displayHour.toString().padStart(2, "0"));
      setMinute(minutesInt.toString().padStart(2, "0"));
      setIsPM(hoursInt >= 12);
    }
  }, [initialTime]);

  const formatTime = () => {
    let hoursInt = parseInt(hour, 10);
    if (isPM && hoursInt !== 12) {
      hoursInt += 12;
    }
    if (!isPM && hoursInt === 12) {
      hoursInt = 0;
    }
    return `${hoursInt.toString().padStart(2, '0')}:${minute}:00`;
  };

  // Trigger callback whenever time is updated
  useEffect(() => {
    if (onTimeSelect) {
      onTimeSelect(formatTime());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, minute, isPM]);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Select Time</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="hour-select" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Hour
              </Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger id="hour-select" className="w-full">
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="minute-select" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Minute
              </Label>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger id="minute-select" className="w-full">
                  <SelectValue placeholder="Minute" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center mt-5 space-x-2 justify-between">
              <Label htmlFor="am-pm-switch" className="text-sm font-medium">
                {isPM ? "PM" : "AM"}
              </Label>
              <Switch id="am-pm-switch" checked={isPM} onCheckedChange={setIsPM} />
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TimePicker12HourProps = {
  value?: string; // "HH:mm" format
  onChange: (value: string) => void;
  disabled?: boolean;
};

const TimePicker12Hour = ({ value, onChange, disabled }: TimePicker12HourProps) => {
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('PM');

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      const hour24 = parseInt(h, 10);
      
      const newPeriod = hour24 >= 12 ? 'PM' : 'AM';
      let newHour12 = hour24 % 12;
      if (newHour12 === 0) newHour12 = 12; // 0 and 12 should be 12

      setHour(String(newHour12));
      setMinute(m);
      setPeriod(newPeriod);
    }
  }, [value]);

  const handleTimeChange = (newHour: string, newMinute: string, newPeriod: string) => {
    let hour24 = parseInt(newHour, 10);
    if (newPeriod === 'PM' && hour24 < 12) {
      hour24 += 12;
    }
    if (newPeriod === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    const formattedHour = String(hour24).padStart(2, '0');
    onChange(`${formattedHour}:${newMinute}`);
  };

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')), []);

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={(h) => { setHour(h); handleTimeChange(h, minute, period); }} disabled={disabled}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span>:</span>
      <Select value={minute} onValueChange={(m) => { setMinute(m); handleTimeChange(hour, m, period); }} disabled={disabled}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={(p) => { setPeriod(p); handleTimeChange(hour, minute, p); }} disabled={disabled}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimePicker12Hour;
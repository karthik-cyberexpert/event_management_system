import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimePickerProps {
  value?: string; // "HH:mm" format
  onChange: (value: string) => void;
  disabled?: boolean;
}

const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const minutes = ['00', '15', '30', '45'];
const periods = ['AM', 'PM'];

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, disabled }) => {
  const [hour, setHour] = React.useState('09');
  const [minute, setMinute] = React.useState('00');
  const [period, setPeriod] = React.useState('AM');

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      let h12 = parseInt(h, 10);
      let p = 'AM';

      if (h12 >= 12) {
        p = 'PM';
        if (h12 > 12) {
          h12 -= 12;
        }
      }
      if (h12 === 0) {
        h12 = 12;
      }

      setHour(String(h12).padStart(2, '0'));
      setMinute(m);
      setPeriod(p);
    } else {
      // Default to 9:00 AM if no value is provided
      setHour('09');
      setMinute('00');
      setPeriod('AM');
    }
  }, [value]);

  const handleChange = (newHour: string, newMinute: string, newPeriod: string) => {
    let h24 = parseInt(newHour, 10);
    if (newPeriod === 'PM' && h24 < 12) {
      h24 += 12;
    }
    if (newPeriod === 'AM' && h24 === 12) {
      h24 = 0;
    }
    const formattedTime = `${String(h24).padStart(2, '0')}:${newMinute}`;
    onChange(formattedTime);
  };

  const handleHourChange = (newHour: string) => {
    setHour(newHour);
    handleChange(newHour, minute, period);
  };

  const handleMinuteChange = (newMinute: string) => {
    setMinute(newMinute);
    handleChange(hour, newMinute, period);
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    handleChange(hour, minute, newPeriod);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>:</span>
      <Select value={minute} onValueChange={handleMinuteChange} disabled={disabled}>
        <SelectTrigger className="w-[70px]">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={period} onValueChange={handlePeriodChange} disabled={disabled}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent>
          {periods.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimePicker;
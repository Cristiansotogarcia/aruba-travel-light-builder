
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DateSelectionSectionProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const DateSelectionSection = ({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: DateSelectionSectionProps) => {
  return (
    <div className="space-y-3">
      <h3 className="font-medium">Rental Period</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs">End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-8"
          />
        </div>
      </div>
    </div>
  );
};

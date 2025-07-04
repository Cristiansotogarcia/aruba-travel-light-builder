
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TempPasswordResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tempPassword: string;
}

interface TempPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  result: TempPasswordResult | null;
}

export const TempPasswordDialog = ({ open, onClose, result }: TempPasswordDialogProps) => {
  const { toast } = useToast();

  const copyTempPassword = () => {
    if (result?.tempPassword) {
      navigator.clipboard.writeText(result.tempPassword);
      toast({
        title: "Copied",
        description: "Temporary password copied to clipboard",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Created Successfully</DialogTitle>
          <DialogDescription>
            A new user has been created. Share the temporary password with them. They will need to change it on their first login.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 mb-2">
              User <strong>{result?.user.name}</strong> has been created successfully.
            </p>
            <p className="text-sm text-green-700">
              Please share the following temporary password with the user. It will expire in 48 hours.
            </p>
          </div>
          
          <div className="bg-gray-50 border rounded-lg p-4">
            <Label className="text-sm font-medium text-gray-700">Temporary Password (OTP)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={result?.tempPassword || ''}
                readOnly
                className="font-mono text-lg"
              />
              <Button variant="outline" size="sm" onClick={copyTempPassword}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>Important:</strong> The user must change this temporary password on their first login. 
              The temporary password will expire in 48 hours.
            </p>
          </div>

          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { X, Camera } from 'lucide-react';

interface QrScannerProps {
  /** Called with the decoded text when a QR code is successfully read. */
  onScan: (text: string) => void;
  /** Called when the user presses Cancel or after a successful scan. */
  onClose: () => void;
}

/**
 * QrScanner — opens the device rear camera, continuously decodes QR codes,
 * and calls onScan(text) on the first successful read.
 *
 * Camera is fully stopped (stream released) on unmount, after a successful
 * scan, or when the user presses Cancel.
 */
const QrScanner = ({ onScan, onClose }: QrScannerProps) => {
  const { toast } = useToast();
  // Stable unique ID for the scanner div — avoids collisions if mounted twice
  const divId = useRef(`qr-scanner-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stoppedRef = useRef(false); // guard against double-stop

  const stopCamera = async () => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // Ignore — scanner may already be stopped
    }
  };

  const handleCancel = async () => {
    await stopCamera();
    onClose();
  };

  useEffect(() => {
    const id = divId.current;
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;
    stoppedRef.current = false;

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
        },
        async (decodedText) => {
          // Called on first successful scan
          await stopCamera();
          toast({ title: 'QR code scanned', description: decodedText });
          onScan(decodedText);
          onClose();
        },
        // Per-frame "no code found" — intentionally ignored
        undefined,
      )
      .catch((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : 'Camera access failed.';
        const isPermission =
          msg.toLowerCase().includes('permission') ||
          msg.toLowerCase().includes('denied') ||
          msg.toLowerCase().includes('notallowed');
        toast({
          title: isPermission ? 'Camera permission denied' : 'Camera error',
          description: isPermission
            ? 'Allow camera access in your browser settings, then try again.'
            : msg,
          variant: 'destructive',
        });
        onClose();
      });

    return () => {
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-3 rounded-lg border border-border bg-black/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Camera className="h-4 w-4" />
          Point camera at the customer&apos;s QR code
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void handleCancel()}
          aria-label="Cancel scan"
        >
          <X className="h-4 w-4" />
          <span className="ml-1">Cancel</span>
        </Button>
      </div>

      {/* html5-qrcode mounts the video stream into this div */}
      <div
        id={divId.current}
        className="mx-auto w-full max-w-sm overflow-hidden rounded-md"
      />
    </div>
  );
};

export default QrScanner;

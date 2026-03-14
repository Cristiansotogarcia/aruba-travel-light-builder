import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { Button } from '@/components/ui/button';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toBlob: () => Promise<Blob | null>;
}

interface SignaturePadProps {
  className?: string;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingRef = useRef(false);
    const emptyRef = useRef(true);
    const [canvasReady, setCanvasReady] = useState(false);

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      const width = parent?.clientWidth || 560;
      const height = 180;
      const scale = window.devicePixelRatio || 1;
      const context = canvas.getContext('2d');

      canvas.width = width * scale;
      canvas.height = height * scale;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      if (!context) return;

      context.scale(scale, scale);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = '#0f172a';
      emptyRef.current = true;
      setCanvasReady(true);
    };

    useEffect(() => {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    const getPoint = (event: PointerEvent | ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      const point = getPoint(event);
      if (!canvas || !context || !point) return;

      drawingRef.current = true;
      canvas.setPointerCapture(event.pointerId);
      context.beginPath();
      context.moveTo(point.x, point.y);
    };

    const drawStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;

      const context = canvasRef.current?.getContext('2d');
      const point = getPoint(event);
      if (!context || !point) return;

      context.lineTo(point.x, point.y);
      context.stroke();
      emptyRef.current = false;
    };

    const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      canvasRef.current?.releasePointerCapture(event.pointerId);
    };

    const clear = () => {
      resizeCanvas();
    };

    const toBlob = async () =>
      await new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob((blob) => resolve(blob), 'image/png');
      });

    useImperativeHandle(ref, () => ({
      clear,
      isEmpty: () => emptyRef.current,
      toBlob,
    }));

    return (
      <div className={className}>
        <div className="overflow-hidden rounded-2xl border border-dashed border-border bg-white">
          <canvas
            ref={canvasRef}
            className="touch-none"
            onPointerDown={beginStroke}
            onPointerMove={drawStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{canvasReady ? 'Draw signature inside the box.' : 'Preparing signature pad...'}</span>
          <Button type="button" variant="outline" size="sm" onClick={clear}>
            Clear
          </Button>
        </div>
      </div>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';

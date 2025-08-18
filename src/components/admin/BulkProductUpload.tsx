import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

function parseCsv(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        resolve(results.data as Record<string, string>[]);
      },
      error: (err: Error) => {
        reject(err);
      },
    });
  });
}

function normalizeRow(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim().toLowerCase().replace(/\s+/g, '_')] = value;
  }
  return normalized;
}

interface Props {
  onComplete?: () => void;
}

export const BulkProductUpload = ({ onComplete }: Props) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    try {
const parsedRows = (await parseCsv(csvFile)).map(normalizeRow);
        const products = parsedRows.map(row => ({
          name: row.name,
          description: row.description || null,
          price_per_day: row.price_per_day ? Number(row.price_per_day) : 0,
          stock_quantity: row.stock_quantity ? Number(row.stock_quantity) : 0,
          availability_status: row.availability_status || 'Available',
          images: row.images ? row.images.split('|').map(s => s.trim()).filter(Boolean) : [],
          category_id: null,
          category: null,
        }));

      if (products.length > 0) {
        const { error } = await supabase.from('equipment').insert(products as any);
        if (error) throw error;
      }

      toast({ title: 'Success', description: 'Products uploaded successfully.' });
      setCsvFile(null);
      if (onComplete) onComplete();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to upload products. Check file format.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
      </div>
      <Button onClick={handleUpload} disabled={!csvFile || uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </Button>
    </div>
  );
};

export default BulkProductUpload;

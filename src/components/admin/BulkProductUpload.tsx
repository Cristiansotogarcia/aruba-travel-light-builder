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
      complete: (results) => {
        resolve(results.data as Record<string, string>[]);
      },
      error: (err) => {
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
      const parsedRows = (await parseCsv(csvFile)).map(normalizeRow);
      const products = parsedRows.map(row => ({
        name: row.name,
        description: row.description || null,
        category: row.category,
        price_per_day: row.price_per_day ? Number(row.price_per_day) : 0,
        stock_quantity: row.stock_quantity ? Number(row.stock_quantity) : 0,
        availability_status: row.availability_status || 'Available',
        image_url: row.image_url || null,
      }));

      if (products.length > 0) {
        const { error } = await supabase.from('products').insert(products);
        if (error) throw error;
        let image_url: string | null = null;
        if (imageName && imageFiles) {
          const file = Array.from(imageFiles).find(f => f.name === imageName);
          if (file) {
            const { data, error } = await supabase.storage
              .from('product-images')
              .upload(`products/${Date.now()}-${file.name}`, file);
            if (!error && data) {
              const urlRes = supabase.storage
                .from('product-images')
                .getPublicUrl(data.path);
              image_url = urlRes.data.publicUrl;
            }
          }
        }
        await supabase.from('products').insert({
          name: row.name,
          description: row.description || null,
          category: row.category,
          price_per_day: row.price_per_day ? Number(row.price_per_day) : 0,
          stock_quantity: row.stock_quantity ? Number(row.stock_quantity) : 0,
          availability_status: row.availability_status || 'Available',
          image_url,
        });
      }
      toast({ title: 'Success', description: 'Products uploaded successfully.' });
      setCsvFile(null);
      setImageFiles(null);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to upload products. Check file format.',
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
      <div>
        <Input type="file" accept="image/*" multiple onChange={e => setImageFiles(e.target.files)} />
      </div>
      <Button onClick={handleUpload} disabled={!csvFile || uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </Button>
    </div>
  );
};

export default BulkProductUpload;

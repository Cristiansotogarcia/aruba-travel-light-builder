import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
function parseCsv(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(results.data);
            },
            error: (err) => {
                reject(err);
            },
        });
    });
}
function normalizeRow(row) {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
        normalized[key.trim().toLowerCase().replace(/\s+/g, '_')] = value;
    }
    return normalized;
}
export const BulkProductUpload = ({ onComplete }) => {
    const [csvFile, setCsvFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();
    const handleUpload = async () => {
        if (!csvFile)
            return;
        setUploading(true);
        try {
            const parsedRows = (await parseCsv(csvFile)).map(normalizeRow);
            const products = parsedRows.map(row => ({
                name: row.name,
                description: row.description || null,
                price_per_day: row.price_per_day ? Number(row.price_per_day) : 0,
                stock_quantity: row.stock_quantity ? Number(row.stock_quantity) : 0,
                availability_status: row.availability_status || 'Available',
                image_url: row.image_url || null,
                category_id: null,
                category: null,
            }));
            if (products.length > 0) {
                const { error } = await supabase.from('equipment').insert(products);
                if (error)
                    throw error;
            }
            toast({ title: 'Success', description: 'Products uploaded successfully.' });
            setCsvFile(null);
            if (onComplete)
                onComplete();
        }
        catch (err) {
            console.error(err);
            toast({
                title: 'Error',
                description: err.message || 'Failed to upload products. Check file format.',
                variant: 'destructive',
            });
        }
        finally {
            setUploading(false);
        }
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { children: _jsx(Input, { type: "file", accept: ".csv", onChange: e => setCsvFile(e.target.files?.[0] || null) }) }), _jsx(Button, { onClick: handleUpload, disabled: !csvFile || uploading, children: uploading ? 'Uploading...' : 'Upload' })] }));
};
export default BulkProductUpload;

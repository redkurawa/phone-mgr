'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePhoneManager } from '@/hooks/use-phone-manager';

export function ImportNumbersDialog({
  manager,
  open,
  onOpenChange,
}: {
  manager: ReturnType<typeof usePhoneManager>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    importText,
    setImportText,
    handleImport,
    handleImportFile,
    lastImportSummary,
    importPreview,
    setImportPreview,
    importing,
    previewingImport,
    handlePreviewImport,
  } = manager;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Phone Numbers</DialogTitle>
          <DialogDescription>
            Support block pattern, range, atau daftar nomor. Maksimal 10.000 nomor unik per import.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='importText'>Import Data</Label>
            <input
              type='file'
              accept='.csv,.txt'
              className='text-sm'
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImportFile(file);
                }
              }}
            />
            <textarea
              id='importText'
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value);
                setImportPreview(null);
              }}
              placeholder='03612812XX&#10;02125617900 - 02125617949&#10;02150842750'
              className='min-h-56 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
            />
          </div>
          {importPreview && (
            <div className='rounded-md border bg-background p-3 text-sm'>
              <div>Ready to import: {importPreview.readyCount}</div>
              <div>Unique parsed: {importPreview.uniqueCount}</div>
              <div>Existing in database: {importPreview.existingCount}</div>
              <div>Invalid rows: {importPreview.invalidEntries.length}</div>
              <div>New blocks: {importPreview.newBlockCount}</div>
            </div>
          )}
          {lastImportSummary && (
            <div className='rounded-md border bg-muted/40 p-3 text-sm'>
              <div>Last import: {lastImportSummary.insertedCount} inserted</div>
              <div>Unique parsed: {lastImportSummary.uniqueCount}</div>
              <div>Invalid rows: {lastImportSummary.invalidEntries.length}</div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant='ghost'
            onClick={() => {
              window.open('/api/phones/import', '_blank', 'noopener,noreferrer');
            }}
          >
            Download Sample
          </Button>
          <Button variant='secondary' onClick={handlePreviewImport} disabled={!importText.trim() || previewingImport || importing}>
            {previewingImport ? 'Checking...' : 'Preview'}
          </Button>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!importText.trim() || importing}>
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

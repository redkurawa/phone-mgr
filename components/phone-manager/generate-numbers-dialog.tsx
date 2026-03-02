'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export function GenerateNumbersDialog({
  manager,
  open,
  onOpenChange,
}: {
  manager: ReturnType<typeof usePhoneManager>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { bulkData, setBulkData, handleGenerate } = manager;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Phone Numbers</DialogTitle>
          <DialogDescription>
            Create new phone numbers in bulk. Use XX for 100-number blocks.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='prefix'>Prefix Pattern</Label>
            <Input
              id='prefix'
              placeholder='e.g., 03612812XX or 021256179XX'
              value={bulkData.prefix}
              onChange={(event) =>
                setBulkData({ ...bulkData, prefix: event.target.value })
              }
            />
            <p className='text-sm text-muted-foreground'>
              Use XX for 100 numbers (00-99), or specify range below
            </p>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='range'>Manual Range (optional)</Label>
            <Input
              id='range'
              placeholder='e.g., 02125617900 - 02125617949'
              value={bulkData.range || ''}
              onChange={(event) =>
                setBulkData({ ...bulkData, range: event.target.value })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate}>Generate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

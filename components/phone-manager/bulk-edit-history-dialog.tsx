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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BulkEditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPhones: string[];
  clientName: string;
  onSuccess?: () => void;
}

export function BulkEditHistoryDialog({
  open,
  onOpenChange,
  selectedPhones,
  clientName,
  onSuccess,
}: BulkEditHistoryDialogProps) {
  const { toast } = useToast();
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!newDate) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return;
    }

    if (selectedPhones.length === 0) {
      toast({
        title: 'Error',
        description: 'No phones selected',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/bulk-history-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneIds: selectedPhones,
          clientName,
          newDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update history dates');
      }

      toast({
        title: 'Success',
        description: `Updated ${data.updatedCount} history entries`,
        variant: 'success',
      });

      setNewDate('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update history dates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Bulk Edit Assignment Date</DialogTitle>
          <DialogDescription>
            Update assignment date for {selectedPhones.length} selected
            phone(s).
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='newDate'>New Assignment Date</Label>
            <Input
              id='newDate'
              type='datetime-local'
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? 'Updating...'
              : `Update ${selectedPhones.length} Phone(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

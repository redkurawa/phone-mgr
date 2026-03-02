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
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

interface BulkDeassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPhones: string[];
  selectedPhoneNumbers: { id: string; number: string }[];
  clientName: string;
  onSuccess?: () => void;
}

export function BulkDeassignDialog({
  open,
  onOpenChange,
  selectedPhones,
  selectedPhoneNumbers,
  clientName,
  onSuccess,
}: BulkDeassignDialogProps) {
  const { toast } = useToast();
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Set default date to today when dialog opens
  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
      setReturnDate(today);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!returnDate) {
      toast({
        title: 'Error',
        description: 'Please select a return date',
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
      const response = await fetch('/api/phones/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedPhones,
          action: 'deassign',
          returnDate,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deassign phone numbers');
      }

      toast({
        title: 'Success',
        description: `Deassigned ${data.count} phone number(s) with return date ${formatDate(returnDate)}`,
        variant: 'success',
      });

      setReturnDate('');
      setNotes('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deassign phone numbers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setReturnDate('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Bulk Deassign</DialogTitle>
          <DialogDescription>
            Return {selectedPhones.length} phone number(s) from {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='max-h-32 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/50'>
            {selectedPhoneNumbers.map((phone) => (
              <div key={phone.id} className='text-sm font-mono'>
                {phone.number}
              </div>
            ))}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='returnDate'>
              Return Date <span className='text-red-500'>*</span>
            </Label>
            <Input
              id='returnDate'
              type='date'
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='notes'>Notes (Optional)</Label>
            <Input
              id='notes'
              placeholder='Additional notes for deassignment...'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={handleSubmit}
            disabled={loading || !returnDate}
          >
            {loading ? 'Processing...' : 'Deassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

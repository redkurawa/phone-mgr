'use client';

import { useState } from 'react';
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
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SilentDeassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SilentDeassignDialog({
  open,
  onOpenChange,
  onSuccess,
}: SilentDeassignDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Phone number is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/silent-deassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          reason: reason.trim() || 'Manual silent deassign',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deassign phone number');
      }

      toast({
        title: 'Success',
        description: `Phone number ${data.phoneNumber} has been silently deassigned from ${data.previousClient}. ${data.deletedHistoryCount} history entries deleted.`,
      });

      setPhoneNumber('');
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber('');
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5 text-amber-500' />
            Silent Deassign
          </DialogTitle>
          <DialogDescription>
            Remove phone number assignment and delete all history entries.
            <span className='block mt-2 text-amber-600 font-medium'>
              Use with caution - this action cannot be undone! Number will
              appear as never used.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='silentPhoneNumber'>Phone Number *</Label>
            <Input
              id='silentPhoneNumber'
              placeholder='e.g., 02150889832'
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className='text-xs text-muted-foreground'>
              Enter the phone number to deassign (will be set to KOSONG)
            </p>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='silentReason'>Reason (Optional)</Label>
            <Input
              id='silentReason'
              placeholder='e.g., Excess assignment, input error'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={handleSubmit}
            disabled={loading || !phoneNumber.trim()}
          >
            {loading ? 'Processing...' : 'Silent Deassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

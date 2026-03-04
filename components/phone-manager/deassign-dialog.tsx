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
import { useState, useEffect } from 'react';

export function DeassignDialog({
  manager,
}: {
  manager: ReturnType<typeof usePhoneManager>;
}) {
  const {
    deassignDialogOpen,
    setDeassignDialogOpen,
    selectedPhone,
    selectedPhones,
    assignNotes,
    setAssignNotes,
    handleDeassign,
  } = manager;

  const [returnDate, setReturnDate] = useState('');

  useEffect(() => {
    if (deassignDialogOpen) {
      const today = new Date().toISOString().split('T')[0];
      setReturnDate(today);
    }
  }, [deassignDialogOpen]);

  return (
    <Dialog open={deassignDialogOpen} onOpenChange={setDeassignDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {selectedPhone
              ? `Deassign - ${selectedPhone.number}`
              : `Deassign ${selectedPhones.length} Numbers`}
          </DialogTitle>
          <DialogDescription>
            {selectedPhone
              ? 'Deassign this phone number from its client'
              : 'Deassign selected phone numbers from their clients'}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='returnDate'>Return Date</Label>
            <Input
              id='returnDate'
              type='date'
              value={returnDate}
              onChange={(event) => setReturnDate(event.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='deassignNotes'>Notes (Optional)</Label>
            <Input
              id='deassignNotes'
              placeholder='Additional notes...'
              value={assignNotes}
              onChange={(event) => setAssignNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => {
              setDeassignDialogOpen(false);
              setAssignNotes('');
              setReturnDate('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={() =>
              handleDeassign(
                !selectedPhone && selectedPhones.length > 0,
                returnDate
              )
            }
          >
            Deassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

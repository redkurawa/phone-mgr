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

export function ReassignDialog({ manager }: { manager: ReturnType<typeof usePhoneManager> }) {
  const {
    reassignDialogOpen,
    setReassignDialogOpen,
    selectedPhone,
    selectedPhones,
    clientName,
    setClientName,
    assignNotes,
    setAssignNotes,
    handleReassign,
  } = manager;

  return (
    <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {selectedPhone
              ? `Reassign - ${selectedPhone.number}`
              : `Reassign ${selectedPhones.length} Numbers`}
          </DialogTitle>
          <DialogDescription>
            {selectedPhone
              ? 'Move this phone number to another client'
              : 'Move selected phone numbers to another client'}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='reassignClientName'>New Client Name (PT)</Label>
            <Input
              id='reassignClientName'
              placeholder='e.g., PT Example Indonesia'
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='reassignNotes'>Notes (Optional)</Label>
            <Input
              id='reassignNotes'
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
              setReassignDialogOpen(false);
              setClientName('');
              setAssignNotes('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleReassign(!selectedPhone && selectedPhones.length > 0)}
            disabled={!clientName.trim()}
          >
            Reassign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

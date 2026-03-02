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

export function AssignDialog({ manager }: { manager: ReturnType<typeof usePhoneManager> }) {
  const {
    assignDialogOpen,
    setAssignDialogOpen,
    selectedPhone,
    selectedPhones,
    clientName,
    setClientName,
    assignNotes,
    setAssignNotes,
    handleAssign,
  } = manager;

  return (
    <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {selectedPhone
              ? `Assign - ${selectedPhone.number}`
              : `Assign ${selectedPhones.length} Numbers`}
          </DialogTitle>
          <DialogDescription>
            {selectedPhone
              ? 'Assign this phone number to a client'
              : 'Assign selected phone numbers to a client'}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='clientName'>Client Name (PT)</Label>
            <Input
              id='clientName'
              placeholder='e.g., PT Example Indonesia'
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='assignNotes'>Notes (Optional)</Label>
            <Input
              id='assignNotes'
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
              setAssignDialogOpen(false);
              setClientName('');
              setAssignNotes('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleAssign(!selectedPhone && selectedPhones.length > 0)}
            disabled={!clientName.trim()}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

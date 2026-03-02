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

export function ActivationDialog({
  manager,
}: {
  manager: ReturnType<typeof usePhoneManager>;
}) {
  const {
    editActivationDialogOpen,
    setEditActivationDialogOpen,
    selectedBlockForEdit,
    newActivationDate,
    setNewActivationDate,
    handleSaveActivationDate,
  } = manager;

  return (
    <Dialog open={editActivationDialogOpen} onOpenChange={setEditActivationDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Activation Date</DialogTitle>
          <DialogDescription>Block: {selectedBlockForEdit?.prefix}</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='activationDate'>Activation Date</Label>
            <Input
              id='activationDate'
              type='date'
              value={newActivationDate}
              onChange={(event) => setNewActivationDate(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setEditActivationDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveActivationDate}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

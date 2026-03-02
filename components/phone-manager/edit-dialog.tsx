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

export function EditDialog({ manager }: { manager: ReturnType<typeof usePhoneManager> }) {
  const {
    editDialogOpen,
    setEditDialogOpen,
    selectedPhone,
    selectedPhones,
    editClientName,
    setEditClientName,
    handleEdit,
    handleBulkEdit,
  } = manager;

  const isBulk = !selectedPhone && selectedPhones.length > 0;

  return (
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isBulk ? `Edit ${selectedPhones.length} Phone Numbers` : 'Edit Phone Number'}</DialogTitle>
          <DialogDescription>
            {isBulk
              ? 'Set client name for selected numbers or leave empty to release them.'
              : selectedPhone?.number}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='editClient'>Client Name (PT)</Label>
            <Input
              id='editClient'
              placeholder='Leave empty for KOSONG status'
              value={editClientName}
              onChange={(event) => setEditClientName(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => {
              setEditDialogOpen(false);
              setEditClientName('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={isBulk ? handleBulkEdit : handleEdit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

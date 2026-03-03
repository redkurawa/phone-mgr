'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getEventTypeColor,
  getEventTypeLabel,
  usePhoneManager,
} from '@/hooks/use-phone-manager';
import { formatDateTimeForHistory } from '@/lib/utils';
import { Calendar, Check, Edit, Trash2, User, X } from 'lucide-react';

export function HistoryDialog({
  manager,
}: {
  manager: ReturnType<typeof usePhoneManager>;
}) {
  const {
    historyDialogOpen,
    setHistoryDialogOpen,
    selectedPhone,
    editingHistoryId,
    editingHistoryDate,
    setEditingHistoryDate,
    setEditingHistoryId,
    isAdmin,
    updateHistoryDate,
    startEditHistoryDate,
    deleteHistory,
  } = manager;

  return (
    <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>History - {selectedPhone?.number}</DialogTitle>
        </DialogHeader>
        <div className='mt-4 space-y-4 max-h-96 overflow-y-auto'>
          {selectedPhone?.history.map((entry) => (
            <div
              key={entry.id}
              className='grid grid-cols-[120px_1fr_auto] gap-3 items-center p-3 border rounded-lg'
            >
              <Badge
                className={`${getEventTypeColor(entry.eventType)} whitespace-nowrap justify-center text-center`}
              >
                {getEventTypeLabel(entry.eventType)}
              </Badge>
              <div className='min-w-0'>
                {entry.clientName && (
                  <div className='font-medium flex items-center gap-2'>
                    <User className='h-4 w-4 flex-shrink-0' />
                    <span className='truncate'>{entry.clientName}</span>
                  </div>
                )}
                {entry.notes && (
                  <p className='text-sm text-muted-foreground truncate'>
                    {entry.notes}
                  </p>
                )}
              </div>
              {editingHistoryId === entry.id ? (
                <div className='flex items-center gap-2 flex-shrink-0'>
                  <Input
                    type='date'
                    value={editingHistoryDate}
                    onChange={(event) =>
                      setEditingHistoryDate(event.target.value)
                    }
                    className='w-auto'
                  />
                  <Button
                    size='sm'
                    onClick={() =>
                      updateHistoryDate(entry.id, editingHistoryDate)
                    }
                  >
                    <Check className='h-4 w-4' />
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      setEditingHistoryId(null);
                      setEditingHistoryDate('');
                    }}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              ) : (
                <div className='flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0'>
                  <Calendar className='h-3 w-3 flex-shrink-0' />
                  <span className='whitespace-nowrap'>
                    {formatDateTimeForHistory(entry.eventDate)}
                  </span>
                  {isAdmin && (
                    <>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6 flex-shrink-0'
                        onClick={() =>
                          startEditHistoryDate(entry.id, entry.eventDate)
                        }
                      >
                        <Edit className='h-3 w-3' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6 flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50'
                        onClick={() => {
                          if (
                            confirm(
                              'Are you sure you want to delete this history entry?'
                            )
                          ) {
                            deleteHistory(entry.id);
                          }
                        }}
                      >
                        <Trash2 className='h-3 w-3' />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {(!selectedPhone?.history || selectedPhone.history.length === 0) && (
            <p className='text-center text-muted-foreground'>
              No history available
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

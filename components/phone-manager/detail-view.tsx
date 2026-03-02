'use client';

import { Button } from '@/components/ui/button';
import { usePhoneManager } from '@/hooks/use-phone-manager';
import { ArrowLeft, Edit, History, User, X } from 'lucide-react';

export function DetailView({ manager }: { manager: ReturnType<typeof usePhoneManager> }) {
  const {
    isAdmin,
    selectedBlock,
    phones,
    statusFilter,
    selectedPhones,
    loading,
    setSelectedPhone,
    setAssignDialogOpen,
    setDeassignDialogOpen,
    setReassignDialogOpen,
    handleBackToBlocks,
    areAllFilteredSelected,
    handleSelectAll,
    handleSelectPhone,
    openHistoryDialog,
    openEditDialog,
    openBulkEditDialog,
    handleDeassignPhone,
    setSelectedPhones,
  } = manager;

  return (
    <div className='border rounded-lg p-4'>
      <div className='flex items-center gap-4 mb-4'>
        <Button variant='outline' size='icon' onClick={handleBackToBlocks}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div className='flex-1'>
          <h2 className='text-lg font-semibold'>{selectedBlock?.prefix}</h2>
          <p className='text-sm text-muted-foreground'>
            {selectedBlock?.available} available / {selectedBlock?.used} used /{' '}
            {selectedBlock?.total} total
          </p>
        </div>
        {isAdmin && phones.length > 0 && (
          <div className='flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md'>
            <input
              type='checkbox'
              id='selectAll'
              checked={areAllFilteredSelected()}
              onChange={handleSelectAll}
              className='w-4 h-4 cursor-pointer'
            />
            <label htmlFor='selectAll' className='text-sm font-medium cursor-pointer select-none'>
              All
            </label>
            <span className='text-xs text-muted-foreground ml-1'>
              (
              {statusFilter === 'ALL'
                ? 'All Status'
                : statusFilter === 'KOSONG'
                  ? 'Free'
                  : 'In Use'}
              )
            </span>
          </div>
        )}
        {isAdmin && selectedPhones.length > 0 && (
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              {selectedPhones.length} selected
            </span>
            {(() => {
              const selectedPhonesData = phones.filter((phone) =>
                selectedPhones.includes(phone.id)
              );
              const allSelectedFree = selectedPhonesData.every(
                (phone) => phone.currentStatus === 'KOSONG'
              );
              const allSelectedInUse = selectedPhonesData.every(
                (phone) => phone.currentStatus === 'PAKAI'
              );
              const allFreePhones = phones.filter((phone) => phone.currentStatus === 'KOSONG');
              const allInUsePhones = phones.filter((phone) => phone.currentStatus === 'PAKAI');
              const allFreeSelected =
                allFreePhones.length > 0 &&
                allFreePhones.every((phone) => selectedPhones.includes(phone.id));
              const allInUseSelected =
                allInUsePhones.length > 0 &&
                allInUsePhones.every((phone) => selectedPhones.includes(phone.id));
              const showAssign = allSelectedFree || allFreeSelected;
              const showDeassign = allSelectedInUse || allInUseSelected;
              const showReassign = allSelectedInUse;

              return (
                <>
                  {showAssign && (
                    <Button
                      size='sm'
                      onClick={() => {
                        setSelectedPhone(null);
                        setAssignDialogOpen(true);
                      }}
                    >
                      Assign
                    </Button>
                  )}
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={openBulkEditDialog}
                  >
                    Edit
                  </Button>
                  {showReassign && (
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setSelectedPhone(null);
                        setReassignDialogOpen(true);
                      }}
                    >
                      Reassign
                    </Button>
                  )}
                  {showDeassign && (
                    <Button
                      size='sm'
                      variant='destructive'
                      onClick={() => {
                        setSelectedPhone(null);
                        setDeassignDialogOpen(true);
                      }}
                    >
                      Deassign
                    </Button>
                  )}
                </>
              );
            })()}
            <Button size='sm' variant='outline' onClick={() => setSelectedPhones([])}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className='grid grid-cols-5 gap-2'>
          {Array.from({ length: 20 }).map((_, index) => (
            <div key={index} className='h-16 bg-muted animate-pulse rounded' />
          ))}
        </div>
      ) : phones.length === 0 ? (
        <div className='text-center py-12 text-muted-foreground'>
          No phone numbers in this block.
        </div>
      ) : (
        <div className='grid grid-cols-5 gap-2'>
          {phones.map((phone) => (
            <div
              key={phone.id}
              className={`p-2 border rounded text-sm flex flex-col gap-1 ${
                phone.currentStatus === 'PAKAI'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className='flex items-center gap-2'>
                {isAdmin && (
                  <input
                    type='checkbox'
                    checked={selectedPhones.includes(phone.id)}
                    onChange={() => handleSelectPhone(phone.id)}
                    className='w-4 h-4'
                  />
                )}
                <span className='font-mono font-medium'>{phone.number}</span>
              </div>
              <div className='flex items-center justify-between gap-1'>
                <span className='text-xs truncate text-muted-foreground'>
                  {phone.currentClient || '-'}
                </span>
                <div className='flex gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6'
                    onClick={() => openHistoryDialog(phone)}
                  >
                    <History className='h-3 w-3' />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-6 w-6'
                        onClick={() => openEditDialog(phone)}
                      >
                        <Edit className='h-3 w-3' />
                      </Button>
                      {phone.currentStatus === 'KOSONG' ? (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 text-green-600'
                          onClick={() => {
                            setSelectedPhone(phone);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <User className='h-3 w-3' />
                        </Button>
                      ) : (
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 text-red-600'
                          onClick={() => handleDeassignPhone(phone)}
                        >
                          <X className='h-3 w-3' />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

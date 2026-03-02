'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { usePhoneManager } from '@/hooks/use-phone-manager';
import { Edit, History, Trash2, User, X } from 'lucide-react';

export function BlocksOrSearchView({
  manager,
}: {
  manager: ReturnType<typeof usePhoneManager>;
}) {
  const {
    search,
    loading,
    phones,
    blocks,
    isAdmin,
    setSelectedPhone,
    setAssignDialogOpen,
    openHistoryDialog,
    openEditDialog,
    handleDeassignPhone,
    handleBlockClick,
    handleEditActivationDate,
    handleDeleteBlock,
  } = manager;

  return (
    <div className='border rounded-lg p-4'>
      {search ? (
        <>
          <h2 className='text-lg font-semibold mb-4'>Search Results for "{search}"</h2>
          {loading ? (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className='h-24 bg-muted animate-pulse rounded-lg' />
              ))}
            </div>
          ) : phones.length === 0 ? (
            <div className='text-center py-12 text-muted-foreground'>
              No phone numbers found matching "{search}".
            </div>
          ) : (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
              {phones.map((phone) => (
                <div
                  key={phone.id}
                  className={`p-4 border rounded-lg hover:bg-accent hover:border-primary transition-colors relative group ${
                    phone.currentStatus === 'PAKAI'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className='font-mono font-bold text-lg'>{phone.number}</div>
                  <div className='text-sm text-muted-foreground mt-1'>
                    <Badge
                      variant={phone.currentStatus === 'PAKAI' ? 'destructive' : 'default'}
                    >
                      {phone.currentStatus === 'KOSONG' ? 'Free' : 'In Use'}
                    </Badge>
                  </div>
                  {phone.currentClient && (
                    <div className='text-sm mt-2 truncate'>
                      <span className='text-muted-foreground'>Client: </span>
                      <span className='font-medium'>{phone.currentClient}</span>
                    </div>
                  )}
                  <div className='flex gap-1 mt-3'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7'
                      onClick={() => openHistoryDialog(phone)}
                    >
                      <History className='h-3.5 w-3.5' />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-7 w-7'
                          onClick={() => openEditDialog(phone)}
                        >
                          <Edit className='h-3.5 w-3.5' />
                        </Button>
                        {phone.currentStatus === 'KOSONG' ? (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 text-green-600'
                            onClick={() => {
                              setSelectedPhone(phone);
                              setAssignDialogOpen(true);
                            }}
                          >
                            <User className='h-3.5 w-3.5' />
                          </Button>
                        ) : (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 text-red-600'
                            onClick={() => handleDeassignPhone(phone)}
                          >
                            <X className='h-3.5 w-3.5' />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <h2 className='text-lg font-semibold mb-4'>Phone Number Blocks</h2>
          {loading ? (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className='h-24 bg-muted animate-pulse rounded-lg' />
              ))}
            </div>
          ) : blocks.length === 0 ? (
            <div className='text-center py-12 text-muted-foreground'>
              No phone blocks found. Generate some to get started.
            </div>
          ) : (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
              {blocks.map((block) => (
                <div
                  key={block.prefix}
                  className='p-4 border rounded-lg hover:bg-accent hover:border-primary transition-colors relative group'
                >
                  <div onClick={() => handleBlockClick(block)} className='cursor-pointer'>
                    <div className='font-mono font-bold text-lg'>{block.prefix}</div>
                    <div className='text-sm text-muted-foreground mt-1'>
                      <span className='text-green-600'>{block.available} Free</span>
                      {' / '}
                      <span className='text-red-600'>{block.used} In Use</span>
                    </div>
                    <div className='flex items-center justify-between text-xs text-muted-foreground mt-1'>
                      <span>Total: {block.total}</span>
                      <span className='flex items-center gap-1'>
                        {block.activationDate
                          ? formatDate(block.activationDate)
                          : 'No activation date'}
                        {isAdmin && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-4 w-4 p-0'
                            onClick={(event) => {
                              event.stopPropagation();
                              handleEditActivationDate(block);
                            }}
                          >
                            <Edit className='h-3 w-3' />
                          </Button>
                        )}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700'
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteBlock(block);
                      }}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

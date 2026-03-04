'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { usePhoneManager } from '@/hooks/use-phone-manager';
import { ArrowLeft, Calendar, Undo2 } from 'lucide-react';
import { BulkEditHistoryDialog } from './bulk-edit-history-dialog';
import { BulkDeassignDialog } from './bulk-deassign-dialog';

export function CustomerViews({
  manager,
}: {
  manager: ReturnType<typeof usePhoneManager>;
}) {
  const {
    viewMode,
    loading,
    customers,
    customerPhones,
    selectedCustomer,
    search,
    setViewMode,
    handleCustomerClick,
    handleBackToCustomers,
    fetchCustomerPhones,
  } = manager;

  // Filter customers based on search input (min 1 char for responsiveness)
  const filteredCustomers = search.trim()
    ? customers.filter((customer) =>
        customer.clientName.toLowerCase().includes(search.toLowerCase().trim())
      )
    : customers;

  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeassignOpen, setBulkDeassignOpen] = useState(false);

  if (viewMode === 'customers') {
    return (
      <div className='border rounded-lg p-4'>
        <div className='flex items-center gap-4 mb-4'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setViewMode('blocks')}
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <h2 className='text-lg font-semibold'>All Customers</h2>
        </div>
        {loading ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className='h-24 bg-muted animate-pulse rounded-lg'
              />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className='text-center py-12 text-muted-foreground'>
            {search.trim()
              ? 'No customers match your search.'
              : 'No customers found.'}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {filteredCustomers.map((customer) => (
              <div
                key={customer.clientName}
                onClick={() => handleCustomerClick(customer)}
                className='p-4 border rounded-lg hover:bg-accent hover:border-primary transition-colors cursor-pointer'
              >
                <div className='flex items-start justify-between'>
                  <div className='font-semibold text-lg'>
                    {customer.clientName}
                  </div>
                  <Badge
                    variant={
                      customer.status === 'active' ? 'default' : 'secondary'
                    }
                  >
                    {customer.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className='text-sm text-muted-foreground mt-2'>
                  <div>
                    Total numbers: {customer.phoneCount} Active:{' '}
                    {customer.activeCount}
                    {customer.status === 'inactive' && (
                      <span className='text-orange-600'>
                        {' '}
                        (Previously had {customer.phoneCount} numbers)
                      </span>
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

  const togglePhoneSelection = (phoneId: string) => {
    setSelectedPhones((prev) =>
      prev.includes(phoneId)
        ? prev.filter((id) => id !== phoneId)
        : [...prev, phoneId]
    );
  };

  const selectAllPhones = () => {
    if (selectedPhones.length === customerPhones.length) {
      setSelectedPhones([]);
    } else {
      setSelectedPhones(customerPhones.map((p) => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedPhones([]);
  };

  return (
    <div className='border rounded-lg p-4'>
      <div className='flex items-center gap-4 mb-4'>
        <Button variant='outline' size='icon' onClick={handleBackToCustomers}>
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <div className='flex-1'>
          <h2 className='text-lg font-semibold'>
            {selectedCustomer?.clientName}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {selectedCustomer?.activeCount} active /{' '}
            {selectedCustomer?.phoneCount} total phone numbers
          </p>
        </div>
        {selectedPhones.length > 0 && (
          <div className='flex items-center gap-2'>
            <span className='text-sm text-muted-foreground'>
              {selectedPhones.length} selected
            </span>
            <Button variant='outline' size='sm' onClick={clearSelection}>
              Clear
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => setBulkDeassignOpen(true)}
            >
              <Undo2 className='h-4 w-4 mr-2' />
              Deassign
            </Button>
            <Button
              variant='default'
              size='sm'
              onClick={() => setBulkEditOpen(true)}
            >
              <Calendar className='h-4 w-4 mr-2' />
              Edit Assignment Date
            </Button>
          </div>
        )}
      </div>

      <BulkEditHistoryDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        selectedPhones={selectedPhones}
        clientName={selectedCustomer?.clientName || ''}
        onSuccess={clearSelection}
      />
      <BulkDeassignDialog
        open={bulkDeassignOpen}
        onOpenChange={setBulkDeassignOpen}
        selectedPhones={selectedPhones}
        selectedPhoneNumbers={customerPhones
          .filter((p) => selectedPhones.includes(p.id))
          .map((p) => ({ id: p.id, number: p.number }))}
        clientName={selectedCustomer?.clientName || ''}
        onSuccess={() => {
          clearSelection();
          if (selectedCustomer) {
            fetchCustomerPhones(selectedCustomer.clientName);
          }
        }}
      />
      {customerPhones.length > 0 && (
        <div className='flex items-center gap-2 mb-3 px-3'>
          <input
            type='checkbox'
            checked={
              selectedPhones.length === customerPhones.length &&
              customerPhones.length > 0
            }
            onChange={selectAllPhones}
            className='h-4 w-4 rounded border-gray-300'
          />
          <span className='text-sm text-muted-foreground'>
            {selectedPhones.length === customerPhones.length
              ? 'Deselect All'
              : 'Select All'}
          </span>
        </div>
      )}

      {loading ? (
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className='h-12 bg-muted animate-pulse rounded-lg'
            />
          ))}
        </div>
      ) : customerPhones.length === 0 ? (
        <div className='text-center py-12 text-muted-foreground'>
          No phone numbers found for this customer.
        </div>
      ) : (
        <div className='space-y-2'>
          {customerPhones.map((phone) => (
            <div
              key={phone.id}
              className={`p-3 border rounded-lg flex items-center justify-between ${
                phone.isActive ? 'bg-green-50 border-green-200' : 'bg-muted/50'
              }`}
            >
              <div className='flex items-center gap-3'>
                <input
                  type='checkbox'
                  checked={selectedPhones.includes(phone.id)}
                  onChange={() => togglePhoneSelection(phone.id)}
                  className='h-4 w-4 rounded border-gray-300'
                />
                <div className='font-mono font-semibold'>{phone.number}</div>
                {phone.isActive ? (
                  <Badge variant='default' className='bg-green-600'>
                    Active
                  </Badge>
                ) : (
                  <Badge variant='secondary'>Returned</Badge>
                )}
              </div>
              {!phone.isActive && phone.returnDate && (
                <div className='text-sm text-muted-foreground'>
                  Returned: {formatDate(phone.returnDate)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

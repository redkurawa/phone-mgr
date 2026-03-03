'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePhoneManager } from '@/hooks/use-phone-manager';
import {
  AlertTriangle,
  ClipboardList,
  Download,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { GenerateNumbersDialog } from '@/components/phone-manager/generate-numbers-dialog';
import { BlocksOrSearchView } from '@/components/phone-manager/blocks-or-search-view';
import { DetailView } from '@/components/phone-manager/detail-view';
import { HistoryDialog } from '@/components/phone-manager/history-dialog';
import { EditDialog } from '@/components/phone-manager/edit-dialog';
import { ActivationDialog } from '@/components/phone-manager/activation-dialog';
import { AssignDialog } from '@/components/phone-manager/assign-dialog';
import { DeassignDialog } from '@/components/phone-manager/deassign-dialog';
import { ReassignDialog } from '@/components/phone-manager/reassign-dialog';
import { CustomerViews } from '@/components/phone-manager/customer-views';
import { ImportNumbersDialog } from '@/components/phone-manager/import-numbers-dialog';
import { SilentDeassignDialog } from '@/components/phone-manager/silent-deassign-dialog';

export function PhoneManagerPage() {
  const manager = usePhoneManager();
  const {
    session,
    router,
    signOut,
    isAdmin,
    viewMode,
    blocks,
    generateDialogOpen,
    setGenerateDialogOpen,
    importDialogOpen,
    setImportDialogOpen,
    userDropdownOpen,
    setUserDropdownOpen,
    silentDeassignDialogOpen,
    setSilentDeassignDialogOpen,
    total,
    search,
    statusFilter,
    setSearchAndReset,
    setStatusFilterAndRefresh,
    openCustomersView,
  } = manager;

  return (
    <div className='min-h-screen bg-background'>
      <div className='container mx-auto py-8 px-4'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
          <div>
            <h1
              className='text-3xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors'
              onClick={() => (window.location.href = '/')}
            >
              Phone Number Manager
            </h1>
            <p className='text-muted-foreground mt-1'>
              Manage your phone number inventory ({total.toLocaleString()}{' '}
              total)
            </p>
          </div>
          <div className='flex flex-wrap gap-2 items-center'>
            <Button
              variant={viewMode === 'customers' ? 'default' : 'outline'}
              onClick={openCustomersView}
            >
              <Users className='mr-2 h-4 w-4' />
              Customers
            </Button>

            {isAdmin && (
              <>
                <Button onClick={() => setGenerateDialogOpen(true)}>
                  <Plus className='mr-2 h-4 w-4' />
                  Numbers
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Download className='mr-2 h-4 w-4' />
                  Import
                </Button>
              </>
            )}

            <div className='relative'>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className='flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors'
              >
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className='w-8 h-8 rounded-full'
                    referrerPolicy='no-referrer'
                  />
                ) : (
                  <div className='w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center'>
                    <span className='text-sm font-medium text-blue-600'>
                      {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </button>

              {userDropdownOpen && (
                <div className='absolute right-0 mt-2 w-48 bg-background border rounded-lg shadow-lg z-50'>
                  <div className='px-4 py-2 border-b'>
                    <p className='text-sm font-medium'>
                      {session?.user?.name || 'User'}
                    </p>
                    <p className='text-xs text-muted-foreground truncate'>
                      {session?.user?.email}
                    </p>
                  </div>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          router.push('/admin/users');
                          setUserDropdownOpen(false);
                        }}
                        className='w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2'
                      >
                        <Settings className='h-4 w-4' />
                        Manage Users
                      </button>
                      <button
                        onClick={() => {
                          router.push('/admin/system');
                          setUserDropdownOpen(false);
                        }}
                        className='w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2'
                      >
                        <ShieldCheck className='h-4 w-4' />
                        System Status
                      </button>
                      <button
                        onClick={() => {
                          router.push('/admin/audit');
                          setUserDropdownOpen(false);
                        }}
                        className='w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2'
                      >
                        <ClipboardList className='h-4 w-4' />
                        Audit Trail
                      </button>
                      <button
                        onClick={() => {
                          setSilentDeassignDialogOpen(true);
                          setUserDropdownOpen(false);
                        }}
                        className='w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-amber-600'
                      >
                        <AlertTriangle className='h-4 w-4' />
                        Silent Deassign
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => signOut()}
                    className='w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2'
                  >
                    <LogOut className='h-4 w-4' />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='flex flex-col sm:flex-row gap-4 mb-6'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              id='inventory-search'
              placeholder='Search by number, prefix, or client name...'
              value={search}
              onChange={(event) => setSearchAndReset(event.target.value)}
              className='pl-10 pr-10'
            />
            {search && (
              <button
                type='button'
                onClick={() => setSearchAndReset('')}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
              >
                <X className='h-4 w-4' />
              </button>
            )}
          </div>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilterAndRefresh}
          >
            <SelectTrigger className='w-full sm:w-[180px]'>
              <SelectValue placeholder='Filter by status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>All Status</SelectItem>
              <SelectItem value='KOSONG'>Free</SelectItem>
              <SelectItem value='PAKAI'>In Use</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === 'customers' || viewMode === 'customer-detail' ? (
          <CustomerViews manager={manager} />
        ) : viewMode === 'blocks' ? (
          <BlocksOrSearchView manager={manager} />
        ) : (
          <DetailView manager={manager} />
        )}

        {viewMode === 'blocks' && blocks.length > 0 && (
          <div className='mt-4 text-sm text-muted-foreground'>
            Showing {blocks.length} blocks
          </div>
        )}

        <div className='mt-2 text-xs text-muted-foreground'>
          Shortcuts: Ctrl/Cmd+K search, G generate, I import, U customers, Esc
          close.
        </div>

        <GenerateNumbersDialog
          manager={manager}
          open={generateDialogOpen}
          onOpenChange={setGenerateDialogOpen}
        />
        <ImportNumbersDialog
          manager={manager}
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
        />
        <HistoryDialog manager={manager} />
        <EditDialog manager={manager} />
        <ActivationDialog manager={manager} />
        <AssignDialog manager={manager} />
        <DeassignDialog manager={manager} />
        <ReassignDialog manager={manager} />
        <SilentDeassignDialog
          open={silentDeassignDialogOpen}
          onOpenChange={setSilentDeassignDialogOpen}
          onSuccess={() => manager.fetchBlocks()}
        />
      </div>
    </div>
  );
}

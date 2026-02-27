'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  formatDate,
  formatDateTime,
  formatDateTimeForHistory,
} from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PhoneCard } from '@/components/phone-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  User,
  Calendar,
  History,
  X,
  Check,
  Trash2,
  Edit,
  ArrowLeft,
  Users,
  LogOut,
  Settings,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PhoneNumber {
  id: string;
  number: string;
  currentStatus: 'KOSONG' | 'PAKAI';
  currentClient: string | null;
  createdAt: string;
  updatedAt: string;
  history: HistoryEntry[];
}

// Helper function to get display status
const getStatusDisplay = (status: 'KOSONG' | 'PAKAI') => {
  return status === 'KOSONG' ? 'Free' : 'In Use';
};

interface HistoryEntry {
  id: string;
  phoneId: string;
  eventType: 'ACTIVATION' | 'ASSIGNED' | 'DEASSIGNED' | 'REASSIGNED';
  clientName: string | null;
  eventDate: string;
  notes: string | null;
}

interface BulkGenerateData {
  prefix: string;
  range?: string;
}

interface PhoneBlock {
  prefix: string;
  total: number;
  used: number;
  available: number;
  activationDate?: string | null;
}

interface Customer {
  clientName: string;
  phoneCount: number;
  activeCount: number;
  status: 'active' | 'inactive';
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'admin';

  const [viewMode, setViewMode] = useState<
    'blocks' | 'detail' | 'customers' | 'customer-detail'
  >('blocks');
  const [blocks, setBlocks] = useState<PhoneBlock[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPhones, setCustomerPhones] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [selectedBlock, setSelectedBlock] = useState<PhoneBlock | null>(null);
  const [phones, setPhones] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deassignDialogOpen, setDeassignDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editActivationDialogOpen, setEditActivationDialogOpen] =
    useState(false);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumber | null>(null);
  const [selectedBlockForEdit, setSelectedBlockForEdit] =
    useState<PhoneBlock | null>(null);
  const [newActivationDate, setNewActivationDate] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [bulkData, setBulkData] = useState<BulkGenerateData>({ prefix: '' });
  const [clientName, setClientName] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingHistoryDate, setEditingHistoryDate] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 50;

  const { toast } = useToast();

  const fetchPhones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(`/api/phones?${params}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setPhones(data.data || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch phone numbers',
        variant: 'destructive',
      });
      setPhones([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, toast]);

  // Fetch all unique blocks (prefixes)
  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/phones?mode=blocks');
      if (!res.ok) throw new Error('Failed to fetch blocks');
      const data = await res.json();
      setBlocks(data.data || []);
      // Calculate total phone numbers from all blocks
      const totalPhones = (data.data || []).reduce(
        (sum: number, block: PhoneBlock) => sum + block.total,
        0
      );
      setTotal(totalPhones);
    } catch (error: any) {
      console.error('Fetch blocks error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch phone blocks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch all customers (active and inactive)
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/phones?mode=customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      setCustomers(data.data || []);
    } catch (error: any) {
      console.error('Fetch customers error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch phones for a specific customer
  const fetchCustomerPhones = useCallback(
    async (clientName: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          mode: 'customer-phones',
          client: clientName,
        });
        const res = await fetch(`/api/phones?${params}`);
        if (!res.ok) throw new Error('Failed to fetch customer phones');
        const data = await res.json();
        setCustomerPhones(data.data || []);
      } catch (error: any) {
        console.error('Fetch customer phones error:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch customer phone numbers',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Initial fetch - only fetch blocks, not phones
  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // Fetch phones when search, statusFilter, or page changes (for list view)
  useEffect(() => {
    // Only fetch phones if we're in blocks view (not in detail view)
    if (viewMode === 'blocks') {
      fetchPhones();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page, viewMode]);

  // Fetch phones by prefix (for detail view)
  const fetchPhonesByPrefix = useCallback(
    async (prefix: string, filterStatus?: string) => {
      setLoading(true);
      try {
        const prefixBase = prefix.replace(/XX$/, '');
        const currentStatus =
          filterStatus !== undefined ? filterStatus : statusFilter;
        const params = new URLSearchParams({
          prefix: prefixBase,
          status: currentStatus,
          limit: '100',
          offset: '0',
        });
        const res = await fetch(`/api/phones?${params}`);
        if (!res.ok) throw new Error('Failed to fetch phones');
        const data = await res.json();
        // Initialize history array for each phone
        const phonesWithHistory = (data.data || []).map(
          (phone: PhoneNumber) => ({
            ...phone,
            history: [],
          })
        );
        setPhones(phonesWithHistory);
        setTotal(data.total || 0);
      } catch (error: any) {
        console.error('Fetch phones error:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch phone numbers',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, statusFilter]
  );

  // Warm up database connection on mount
  useEffect(() => {
    const warmupAndFetch = async () => {
      try {
        // First warm up DB connection
        await fetch('/api/health', { cache: 'no-store' });
        console.log('DB warmed up');
      } catch (err) {
        console.warn('Warmup failed:', err);
      } finally {
        // Then fetch blocks
        fetchBlocks();
      }
    };

    warmupAndFetch();
  }, [fetchBlocks]);

  // Handle clicking on a block
  const handleBlockClick = (block: PhoneBlock) => {
    setSelectedBlock(block);
    setSelectedPhones([]);
    fetchPhonesByPrefix(block.prefix);
    setViewMode('detail');
  };

  // Handle clicking on a customer
  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerPhones(customer.clientName);
    setViewMode('customer-detail');
  };

  // Handle back to blocks
  const handleBackToBlocks = () => {
    setViewMode('blocks');
    setSelectedBlock(null);
    setSelectedPhones([]);
    fetchBlocks();
  };

  // Handle back to customers list
  const handleBackToCustomers = () => {
    setViewMode('customers');
    setSelectedCustomer(null);
    setCustomerPhones([]);
    fetchCustomers();
  };

  // Delete a block
  const handleDeleteBlock = async (block: PhoneBlock) => {
    if (!confirm(`Delete all numbers in block ${block.prefix}?`)) return;

    try {
      const prefixBase = block.prefix.replace(/XX$/, '');
      const res = await fetch(`/api/phones?prefix=${prefixBase}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Deleted block ${block.prefix}`,
          variant: 'success',
        });
        fetchBlocks();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete block',
        variant: 'destructive',
      });
    }
  };

  // Open edit activation date dialog
  const handleEditActivationDate = (block: PhoneBlock) => {
    setSelectedBlockForEdit(block);
    setNewActivationDate(
      block.activationDate
        ? new Date(block.activationDate).toISOString().split('T')[0]
        : ''
    );
    setEditActivationDialogOpen(true);
  };

  // Save edited activation date
  const handleSaveActivationDate = async () => {
    if (!selectedBlockForEdit || !newActivationDate) return;

    try {
      const prefixBase = selectedBlockForEdit.prefix.replace(/XX$/, '');
      const res = await fetch('/api/phones/block/activation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prefix: prefixBase,
          activationDate: newActivationDate,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Activation date updated',
          variant: 'success',
        });
        setEditActivationDialogOpen(false);

        // Update the specific block's activation date in state
        setBlocks((prevBlocks) =>
          prevBlocks.map((block) =>
            block.prefix === selectedBlockForEdit.prefix
              ? { ...block, activationDate: newActivationDate }
              : block
          )
        );
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update activation date',
        variant: 'destructive',
      });
    }
  };

  const handleGenerate = async () => {
    try {
      const res = await fetch('/api/phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkData),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Generated ${data.count} phone numbers`,
          variant: 'success',
        });
        setGenerateDialogOpen(false);
        setBulkData({ prefix: '' });
        fetchPhones();
        fetchBlocks(); // Refresh blocks list
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate phone numbers',
        variant: 'destructive',
      });
    }
  };

  const handleAssign = async (isBulk: boolean = false) => {
    try {
      const ids = isBulk ? selectedPhones : [selectedPhone?.id];
      const res = await fetch('/api/phones/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          action: 'assign',
          clientName,
          notes: assignNotes,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Assigned ${data.count} phone number(s) to ${clientName}`,
          variant: 'success',
        });
        setAssignDialogOpen(false);
        setClientName('');
        setAssignNotes('');
        setSelectedPhones([]);
        // Refresh the correct view
        if (viewMode === 'detail' && selectedBlock) {
          fetchPhonesByPrefix(selectedBlock.prefix);
        } else {
          fetchPhones();
        }
        fetchBlocks();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign phone numbers',
        variant: 'destructive',
      });
    }
  };

  const handleDeassign = async (isBulk: boolean = false) => {
    try {
      const ids = isBulk ? selectedPhones : [selectedPhone?.id];
      const res = await fetch('/api/phones/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          action: 'deassign',
          notes: assignNotes,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Deassigned ${data.count} phone number(s)`,
          variant: 'success',
        });
        setDeassignDialogOpen(false);
        setAssignNotes('');
        setSelectedPhones([]);
        // Refresh the correct view
        if (viewMode === 'detail' && selectedBlock) {
          fetchPhonesByPrefix(selectedBlock.prefix);
        } else {
          fetchPhones();
        }
        fetchBlocks();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deassign phone numbers',
        variant: 'destructive',
      });
    }
  };

  // Handle single phone deassign from detail view
  const handleDeassignPhone = async (phone: PhoneNumber) => {
    try {
      const res = await fetch(`/api/phones/${phone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStatus: 'KOSONG',
          currentClient: null,
          action: 'deassign',
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Deassigned ${phone.number}`,
          variant: 'success',
        });
        // Refresh the phones in detail view
        if (selectedBlock) {
          fetchPhonesByPrefix(selectedBlock.prefix);
        }
      } else {
        throw new Error('Failed to deassign');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deassign phone number',
        variant: 'destructive',
      });
    }
  };

  const handleSelectPhone = (id: string) => {
    setSelectedPhones((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Handle select all based on current status filter
  const handleSelectAll = () => {
    const filteredPhones = phones.filter((phone) => {
      if (statusFilter === 'ALL') return true;
      return phone.currentStatus === statusFilter;
    });
    const filteredIds = filteredPhones.map((p) => p.id);

    // If all filtered phones are already selected, unselect them
    const allSelected = filteredIds.every((id) => selectedPhones.includes(id));

    if (allSelected) {
      // Unselect only the filtered ones
      setSelectedPhones((prev) =>
        prev.filter((id) => !filteredIds.includes(id))
      );
    } else {
      // Select all filtered ones
      setSelectedPhones((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  // Check if all filtered phones are selected (for checkbox state)
  const areAllFilteredSelected = () => {
    const filteredPhones = phones.filter((phone) => {
      if (statusFilter === 'ALL') return true;
      return phone.currentStatus === statusFilter;
    });
    if (filteredPhones.length === 0) return false;
    return filteredPhones.every((p) => selectedPhones.includes(p.id));
  };

  const openHistoryDialog = (phone: PhoneNumber) => {
    setSelectedPhone(phone);
    setHistoryDialogOpen(true);
    // Fetch history on demand since it's not included in the list by default
    fetchPhoneHistory(phone.id);
  };

  const fetchPhoneHistory = async (phoneId: string) => {
    try {
      console.log('Frontend: Fetching history for phone:', phoneId);
      const res = await fetch(`/api/phones/${phoneId}/history?_=${Date.now()}`, {
        cache: 'no-store',
      });
      console.log('Frontend: Fetch response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log(
          'Frontend: History data received:',
          data.data?.length,
          'entries'
        );
        console.log('Frontend: History entries:', JSON.stringify(data.data));
        // Update the selected phone with the fetched history
        // The API returns { data: history, total, limit, offset }
        setSelectedPhone((prev) => {
          if (!prev) return null;
          const updated = { ...prev, history: data.data || [] };
          console.log(
            'Frontend: Updated phone state:',
            JSON.stringify(updated)
          );
          return updated;
        });
      } else {
        console.error('Failed to fetch history:', res.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  // Update history date
  const updateHistoryDate = async (historyId: string, newDate: string) => {
    try {
      if (!selectedPhone) return;

      console.log('Updating history date:', { historyId, newDate });

      const res = await fetch(`/api/phones/${selectedPhone.id}/history`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historyId,
          eventDate: newDate,
        }),
      });

      const data = await res.json();
      console.log('Update response:', res.status, data);

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'History date updated successfully',
          variant: 'success',
        });

        // Update the history entry directly in state instead of refetching
        setSelectedPhone((prev) => {
          if (!prev) return null;
          const updatedHistory = prev.history.map((entry) =>
            entry.id === historyId ? { ...entry, eventDate: newDate } : entry
          );
          return { ...prev, history: updatedHistory };
        });

        setEditingHistoryId(null);
        setEditingHistoryDate('');
      } else {
        throw new Error(data.error || 'Failed to update history date');
      }
    } catch (error: any) {
      console.error('Error updating history date:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update history date',
        variant: 'destructive',
      });
    }
  };

  // Start editing history date
  const startEditHistoryDate = (historyId: string, currentDate: string) => {
    setEditingHistoryId(historyId);
    // Format date for input (YYYY-MM-DDTHH:MM)
    const date = new Date(currentDate);
    const formatted = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);
    setEditingHistoryDate(formatted);
  };

  const openEditDialog = (phone: PhoneNumber) => {
    setSelectedPhone(phone);
    setEditClientName(phone.currentClient || '');
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!selectedPhone) return;

    try {
      const action =
        selectedPhone.currentStatus === 'PAKAI'
          ? selectedPhone.currentClient !== editClientName
            ? 'reassign'
            : null
          : editClientName
            ? 'assign'
            : null;

      const res = await fetch(`/api/phones/${selectedPhone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStatus: editClientName ? 'PAKAI' : 'KOSONG',
          currentClient: editClientName || null,
          action,
          notes: 'Manual edit',
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Phone number updated',
          variant: 'success',
        });
        setEditDialogOpen(false);
        fetchPhones();
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update phone number',
        variant: 'destructive',
      });
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ACTIVATION: 'Aktivasi',
      ASSIGNED: 'Dipakai',
      DEASSIGNED: 'Dikembalikan',
      REASSIGNED: 'Dipakai Kembali',
    };
    return labels[type] || type;
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ACTIVATION: 'bg-blue-100 text-blue-800',
      ASSIGNED: 'bg-green-100 text-green-800',
      DEASSIGNED: 'bg-orange-100 text-orange-800',
      REASSIGNED: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className='min-h-screen bg-background'>
      <div className='container mx-auto py-8 px-4'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Phone Number Manager
            </h1>
            <p className='text-muted-foreground mt-1'>
              Manage your phone number inventory ({total.toLocaleString()}{' '}
              total)
            </p>
          </div>
          <div className='flex flex-wrap gap-2 items-center'>
            {/* Customer Button */}
            <Button
              variant={viewMode === 'customers' ? 'default' : 'outline'}
              onClick={() => {
                setViewMode('customers');
                fetchCustomers();
              }}
            >
              <Users className='mr-2 h-4 w-4' />
              Customers
            </Button>

            {/* Generate Numbers - Only for admins */}
            {isAdmin && (
              <Dialog
                open={generateDialogOpen}
                onOpenChange={setGenerateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className='mr-2 h-4 w-4' />
                    Numbers
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Phone Numbers</DialogTitle>
                    <DialogDescription>
                      Create new phone numbers in bulk. Use XX for 100-number
                      blocks.
                    </DialogDescription>
                  </DialogHeader>
                  <div className='grid gap-4 py-4'>
                    <div className='grid gap-2'>
                      <Label htmlFor='prefix'>Prefix Pattern</Label>
                      <Input
                        id='prefix'
                        placeholder='e.g., 03612812XX or 021256179XX'
                        value={bulkData.prefix}
                        onChange={(e) =>
                          setBulkData({ ...bulkData, prefix: e.target.value })
                        }
                      />
                      <p className='text-sm text-muted-foreground'>
                        Use XX for 100 numbers (00-99), or specify range below
                      </p>
                    </div>
                    <div className='grid gap-2'>
                      <Label htmlFor='range'>Manual Range (optional)</Label>
                      <Input
                        id='range'
                        placeholder='e.g., 02125617900 - 02125617949'
                        value={bulkData.range || ''}
                        onChange={(e) =>
                          setBulkData({ ...bulkData, range: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant='outline'
                      onClick={() => setGenerateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleGenerate}>Generate</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* User Dropdown */}
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

        {/* Filters */}
        <div className='flex flex-col sm:flex-row gap-4 mb-6'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search by number, prefix, or client name...'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className='pl-10 pr-10'
            />
            {search && (
              <button
                type='button'
                onClick={() => {
                  setSearch('');
                  setPage(0);
                }}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
              >
                <X className='h-4 w-4' />
              </button>
            )}
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(0);
              // If in detail view, refetch with prefix and new filter
              if (viewMode === 'detail' && selectedBlock) {
                fetchPhonesByPrefix(selectedBlock.prefix, v);
              }
            }}
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

        {/* Main Content - Block View, Customers View, or Detail View */}
        {viewMode === 'customers' ? (
          /* Customers List View */
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
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className='h-24 bg-muted animate-pulse rounded-lg'
                  />
                ))}
              </div>
            ) : customers.length === 0 ? (
              <div className='text-center py-12 text-muted-foreground'>
                No customers found.
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {customers.map((customer) => (
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
        ) : viewMode === 'customer-detail' ? (
          /* Customer Detail View */
          <div className='border rounded-lg p-4'>
            <div className='flex items-center gap-4 mb-4'>
              <Button
                variant='outline'
                size='icon'
                onClick={handleBackToCustomers}
              >
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div>
                <h2 className='text-lg font-semibold'>
                  {selectedCustomer?.clientName}
                </h2>
                <p className='text-sm text-muted-foreground'>
                  {selectedCustomer?.activeCount} active /{' '}
                  {selectedCustomer?.phoneCount} total phone numbers
                </p>
              </div>
            </div>
            {loading ? (
              <div className='space-y-2'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
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
                      phone.isActive
                        ? 'bg-green-50 border-green-200'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <div className='font-mono font-semibold'>
                        {phone.number}
                      </div>
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
        ) : viewMode === 'blocks' ? (
          /* Block List View or Search Results */
          <div className='border rounded-lg p-4'>
            {search ? (
              /* Search Results View */
              <>
                <h2 className='text-lg font-semibold mb-4'>
                  Search Results for "{search}"
                </h2>
                {loading ? (
                  <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className='h-24 bg-muted animate-pulse rounded-lg'
                      />
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
                        <div className='font-mono font-bold text-lg'>
                          {phone.number}
                        </div>
                        <div className='text-sm text-muted-foreground mt-1'>
                          <Badge
                            variant={
                              phone.currentStatus === 'PAKAI'
                                ? 'destructive'
                                : 'default'
                            }
                          >
                            {phone.currentStatus === 'KOSONG'
                              ? 'Free'
                              : 'In Use'}
                          </Badge>
                        </div>
                        {phone.currentClient && (
                          <div className='text-sm mt-2 truncate'>
                            <span className='text-muted-foreground'>
                              Client:{' '}
                            </span>
                            <span className='font-medium'>
                              {phone.currentClient}
                            </span>
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
              /* Blocks View */
              <>
                <h2 className='text-lg font-semibold mb-4'>
                  Phone Number Blocks
                </h2>
                {loading ? (
                  <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className='h-24 bg-muted animate-pulse rounded-lg'
                      />
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
                        <div
                          onClick={() => handleBlockClick(block)}
                          className='cursor-pointer'
                        >
                          <div className='font-mono font-bold text-lg'>
                            {block.prefix}
                          </div>
                          <div className='text-sm text-muted-foreground mt-1'>
                            <span className='text-green-600'>
                              {block.available} Free
                            </span>
                            {' / '}
                            <span className='text-red-600'>
                              {block.used} In Use
                            </span>
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditActivationDate(block);
                                  }}
                                  title={
                                    block.activationDate
                                      ? 'Edit activation date'
                                      : 'Set activation date'
                                  }
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
                            onClick={(e) => {
                              e.stopPropagation();
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
        ) : (
          /* Detail View - 5 columns, 20 rows for 100 numbers */
          <div className='border rounded-lg p-4'>
            {/* Back button and header */}
            <div className='flex items-center gap-4 mb-4'>
              <Button
                variant='outline'
                size='icon'
                onClick={handleBackToBlocks}
              >
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div className='flex-1'>
                <h2 className='text-lg font-semibold'>
                  {selectedBlock?.prefix}
                </h2>
                <p className='text-sm text-muted-foreground'>
                  {selectedBlock?.available} available / {selectedBlock?.used}{' '}
                  used / {selectedBlock?.total} total
                </p>
              </div>
              {/* Select All Checkbox - only for admin */}
              {isAdmin && phones.length > 0 && (
                <div className='flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md'>
                  <input
                    type='checkbox'
                    id='selectAll'
                    checked={areAllFilteredSelected()}
                    onChange={handleSelectAll}
                    className='w-4 h-4 cursor-pointer'
                  />
                  <label
                    htmlFor='selectAll'
                    className='text-sm font-medium cursor-pointer select-none'
                  >
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
              {/* Bulk Actions - aligned right with header */}
              {isAdmin && selectedPhones.length > 0 && (
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium text-muted-foreground'>
                    {selectedPhones.length} selected
                  </span>
                  {(() => {
                    const selectedPhonesData = phones.filter((p) =>
                      selectedPhones.includes(p.id)
                    );
                    // Check if all selected phones are the same status
                    const allSelectedFree = selectedPhonesData.every(
                      (p) => p.currentStatus === 'KOSONG'
                    );
                    const allSelectedInUse = selectedPhonesData.every(
                      (p) => p.currentStatus === 'PAKAI'
                    );

                    // Check if all free/in-use phones in the block are selected
                    const allFreePhones = phones.filter(
                      (p) => p.currentStatus === 'KOSONG'
                    );
                    const allInUsePhones = phones.filter(
                      (p) => p.currentStatus === 'PAKAI'
                    );
                    const allFreeSelected =
                      allFreePhones.length > 0 &&
                      allFreePhones.every((p) => selectedPhones.includes(p.id));
                    const allInUseSelected =
                      allInUsePhones.length > 0 &&
                      allInUsePhones.every((p) =>
                        selectedPhones.includes(p.id)
                      );

                    // Show Assign button if all free phones are selected
                    // Show Deassign button if all in-use phones are selected
                    const showAssign = allSelectedFree || allFreeSelected;
                    const showDeassign = allSelectedInUse || allInUseSelected;

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
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setSelectedPhones([])}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className='grid grid-cols-5 gap-2'>
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className='h-16 bg-muted animate-pulse rounded'
                  />
                ))}
              </div>
            ) : phones.length === 0 ? (
              <div className='text-center py-12 text-muted-foreground'>
                No phone numbers in this block.
              </div>
            ) : (
              /* 5 columns, 20 rows grid - each phone takes 2 lines worth */
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
                    {/* Line 1: Checkbox + Number */}
                    <div className='flex items-center gap-2'>
                      {isAdmin && (
                        <input
                          type='checkbox'
                          checked={selectedPhones.includes(phone.id)}
                          onChange={() => handleSelectPhone(phone.id)}
                          className='w-4 h-4'
                        />
                      )}
                      <span className='font-mono font-medium'>
                        {phone.number}
                      </span>
                    </div>
                    {/* Line 2: Client name + Action menu */}
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
        )}

        {/* Pagination - only show in block view */}
        {viewMode === 'blocks' && blocks.length > 0 && (
          <div className='mt-4 text-sm text-muted-foreground'>
            Showing {blocks.length} blocks
          </div>
        )}

        {/* History Dialog */}
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
                        type='datetime-local'
                        value={editingHistoryDate}
                        onChange={(e) => setEditingHistoryDate(e.target.value)}
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
                      )}
                    </div>
                  )}
                </div>
              ))}
              {(!selectedPhone?.history ||
                selectedPhone.history.length === 0) && (
                <p className='text-center text-muted-foreground'>
                  No history available
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Phone Number</DialogTitle>
              <DialogDescription>{selectedPhone?.number}</DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='editClient'>Client Name (PT)</Label>
                <Input
                  id='editClient'
                  placeholder='Leave empty for KOSONG status'
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Activation Date Dialog */}
        <Dialog
          open={editActivationDialogOpen}
          onOpenChange={setEditActivationDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Activation Date</DialogTitle>
              <DialogDescription>
                Block: {selectedBlockForEdit?.prefix}
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='activationDate'>Activation Date</Label>
                <Input
                  id='activationDate'
                  type='date'
                  value={newActivationDate}
                  onChange={(e) => setNewActivationDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => setEditActivationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveActivationDate}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Dialog - Works for both single and bulk */}
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
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='assignNotes'>Notes (Optional)</Label>
                <Input
                  id='assignNotes'
                  placeholder='Additional notes...'
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
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
                onClick={() =>
                  handleAssign(!selectedPhone && selectedPhones.length > 0)
                }
                disabled={!clientName.trim()}
              >
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deassign Dialog - Works for both single and bulk */}
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
                <Label htmlFor='deassignNotes'>Notes (Optional)</Label>
                <Input
                  id='deassignNotes'
                  placeholder='Additional notes...'
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={() => {
                  setDeassignDialogOpen(false);
                  setAssignNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant='destructive'
                onClick={() =>
                  handleDeassign(!selectedPhone && selectedPhones.length > 0)
                }
              >
                Deassign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

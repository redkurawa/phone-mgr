'use client';

import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';

export interface HistoryEntry {
  id: string;
  phoneId: string;
  eventType:
    | 'ACTIVATION'
    | 'ASSIGNED'
    | 'DEASSIGNED'
    | 'REASSIGNED'
    | 'EDITED'
    | 'DELETED';
  clientName: string | null;
  eventDate: string;
  notes: string | null;
}

export interface PhoneNumber {
  id: string;
  number: string;
  currentStatus: 'KOSONG' | 'PAKAI';
  currentClient: string | null;
  createdAt: string;
  updatedAt: string;
  history: HistoryEntry[];
}

export interface BulkGenerateData {
  prefix: string;
  range?: string;
}

export interface PhoneBlock {
  prefix: string;
  total: number;
  used: number;
  available: number;
  activationDate?: string | null;
}

export interface Customer {
  clientName: string;
  phoneCount: number;
  activeCount: number;
  status: 'active' | 'inactive';
}

export interface ImportPreviewSummary {
  parsedCount: number;
  uniqueCount: number;
  invalidEntries: string[];
  existingCount: number;
  readyCount: number;
  newBlockCount: number;
}

type ViewMode = 'blocks' | 'detail' | 'customers' | 'customer-detail';

export function getStatusDisplay(status: 'KOSONG' | 'PAKAI') {
  return status === 'KOSONG' ? 'Free' : 'In Use';
}

export function getEventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    ACTIVATION: 'Aktivasi',
    ASSIGNED: 'Dipakai',
    DEASSIGNED: 'Dikembalikan',
    REASSIGNED: 'Dipakai Kembali',
    EDITED: 'Diubah',
    DELETED: 'Dihapus',
  };

  return labels[type] || type;
}

export function getEventTypeColor(type: string) {
  const colors: Record<string, string> = {
    ACTIVATION: 'bg-blue-100 text-blue-800',
    ASSIGNED: 'bg-green-100 text-green-800',
    DEASSIGNED: 'bg-orange-100 text-orange-800',
    REASSIGNED: 'bg-purple-100 text-purple-800',
    EDITED: 'bg-slate-100 text-slate-800',
    DELETED: 'bg-red-100 text-red-800',
  };

  return colors[type] || 'bg-gray-100 text-gray-800';
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }

  return payload;
}

export function usePhoneManager() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const isAdmin = session?.user?.role === 'admin';
  const limit = 50;

  const [viewMode, setViewMode] = useState<ViewMode>('blocks');
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
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deassignDialogOpen, setDeassignDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editActivationDialogOpen, setEditActivationDialogOpen] =
    useState(false);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumber | null>(null);
  const [selectedBlockForEdit, setSelectedBlockForEdit] =
    useState<PhoneBlock | null>(null);
  const [newActivationDate, setNewActivationDate] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [silentDeassignDialogOpen, setSilentDeassignDialogOpen] =
    useState(false);
  const [bulkData, setBulkData] = useState<BulkGenerateData>({ prefix: '' });
  const [importText, setImportText] = useState('');
  const [lastImportSummary, setLastImportSummary] = useState<{
    insertedCount: number;
    uniqueCount: number;
    invalidEntries: string[];
  } | null>(null);
  const [importPreview, setImportPreview] =
    useState<ImportPreviewSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [clientName, setClientName] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingHistoryDate, setEditingHistoryDate] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const fetchPhones = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: deferredSearch,
        status: statusFilter,
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/phones?${params}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await readJson(response);
      setPhones(data.data || []);
      setTotal(data.total || 0);
    } catch (error: any) {
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
  }, [deferredSearch, page, statusFilter, toast]);

  const fetchBlocks = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const data = await readJson(await fetch('/api/phones?mode=blocks'));
        setBlocks(data.data || []);
        const totalPhones = (data.data || []).reduce(
          (sum: number, block: PhoneBlock) => sum + block.total,
          0
        );
        setTotal(totalPhones);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to fetch phone blocks',
          variant: 'destructive',
        });
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [toast]
  );

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await readJson(await fetch('/api/phones?mode=customers'));
      setCustomers(data.data || []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCustomerPhones = useCallback(
    async (customerName: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          mode: 'customer-phones',
          client: customerName,
        });
        const data = await readJson(await fetch(`/api/phones?${params}`));
        setCustomerPhones(data.data || []);
      } catch {
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
        const data = await readJson(await fetch(`/api/phones?${params}`));
        const phonesWithHistory = (data.data || []).map(
          (phone: PhoneNumber) => ({
            ...phone,
            history: [],
          })
        );
        setPhones(phonesWithHistory);
        setTotal(data.total || 0);
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to fetch phone numbers',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, toast]
  );

  useEffect(() => {
    if (
      (viewMode === 'blocks' || viewMode === 'detail') &&
      deferredSearch.trim()
    ) {
      fetchPhones();
    }
  }, [deferredSearch, fetchPhones, viewMode]);

  useEffect(() => {
    const warmupAndFetch = async () => {
      try {
        await fetch('/api/health', { cache: 'no-store' });
      } catch {}
      fetchBlocks();
    };

    warmupAndFetch();
  }, [fetchBlocks]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('inventory-search')?.focus();
        return;
      }

      if (isTypingTarget) {
        return;
      }

      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
        setGenerateDialogOpen(false);
        setImportDialogOpen(false);
        setAssignDialogOpen(false);
        setDeassignDialogOpen(false);
        setReassignDialogOpen(false);
        setEditDialogOpen(false);
        setEditActivationDialogOpen(false);
        setHistoryDialogOpen(false);
        return;
      }

      if (!isAdmin) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'g') {
        event.preventDefault();
        setGenerateDialogOpen(true);
        return;
      }

      if (key === 'i') {
        event.preventDefault();
        setImportDialogOpen(true);
        return;
      }

      if (key === 'u') {
        event.preventDefault();
        setViewMode('customers');
        fetchCustomers();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [fetchCustomers, isAdmin]);

  const refreshCurrentView = useCallback(() => {
    if (viewMode === 'detail' && selectedBlock) {
      fetchPhonesByPrefix(selectedBlock.prefix);
      return;
    }

    if (viewMode === 'customer-detail' && selectedCustomer) {
      fetchCustomerPhones(selectedCustomer.clientName);
      return;
    }

    if (viewMode === 'customers') {
      fetchCustomers();
      return;
    }

    fetchPhones();
  }, [
    fetchCustomerPhones,
    fetchCustomers,
    fetchPhones,
    fetchPhonesByPrefix,
    selectedBlock,
    selectedCustomer,
    viewMode,
  ]);

  const handleBlockClick = (block: PhoneBlock) => {
    setSelectedBlock(block);
    setSelectedPhones([]);
    fetchPhonesByPrefix(block.prefix);
    setViewMode('detail');
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerPhones(customer.clientName);
    setViewMode('customer-detail');
  };

  const handleBackToBlocks = () => {
    setViewMode('blocks');
    setSelectedBlock(null);
    setSelectedPhones([]);
    fetchBlocks();
  };

  const handleBackToCustomers = () => {
    setViewMode('customers');
    setSelectedCustomer(null);
    setCustomerPhones([]);
    fetchCustomers();
  };

  const handleDeleteBlock = async (block: PhoneBlock) => {
    if (!confirm(`Delete all numbers in block ${block.prefix}?`)) return;

    try {
      const prefixBase = block.prefix.replace(/XX$/, '');
      await readJson(
        await fetch(`/api/phones?prefix=${prefixBase}`, {
          method: 'DELETE',
        })
      );

      toast({
        title: 'Success',
        description: `Deleted block ${block.prefix}`,
        variant: 'success',
      });
      fetchBlocks();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete block',
        variant: 'destructive',
      });
    }
  };

  const handleEditActivationDate = (block: PhoneBlock) => {
    setSelectedBlockForEdit(block);
    setNewActivationDate(
      block.activationDate
        ? new Date(block.activationDate).toISOString().split('T')[0]
        : ''
    );
    setEditActivationDialogOpen(true);
  };

  const handleSaveActivationDate = async () => {
    if (!selectedBlockForEdit || !newActivationDate) return;

    try {
      const prefixBase = selectedBlockForEdit.prefix.replace(/XX$/, '');
      await readJson(
        await fetch('/api/phones/block/activation', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prefix: prefixBase,
            activationDate: newActivationDate,
          }),
        })
      );

      toast({
        title: 'Success',
        description: 'Activation date updated',
        variant: 'success',
      });
      setEditActivationDialogOpen(false);
      setBlocks((previousBlocks) =>
        previousBlocks.map((block) =>
          block.prefix === selectedBlockForEdit.prefix
            ? { ...block, activationDate: newActivationDate }
            : block
        )
      );
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update activation date',
        variant: 'destructive',
      });
    }
  };

  const handleGenerate = async () => {
    try {
      const data = await readJson(
        await fetch('/api/phones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bulkData),
        })
      );

      toast({
        title: 'Success',
        description: `Generated ${data.count} phone numbers`,
        variant: 'success',
      });
      setGenerateDialogOpen(false);
      setBulkData({ prefix: '' });
      refreshCurrentView();
      fetchBlocks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate phone numbers',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      const data = await readJson(
        await fetch('/api/phones/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: importText,
          }),
        })
      );

      toast({
        title: 'Success',
        description: `Imported ${data.count} of ${data.uniqueCount} unique phone numbers`,
        variant: 'success',
      });
      setLastImportSummary({
        insertedCount: data.count,
        uniqueCount: data.uniqueCount,
        invalidEntries: data.invalidEntries || [],
      });
      setImportPreview(null);
      setImportDialogOpen(false);
      setImportText('');
      refreshCurrentView();
      fetchBlocks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import phone numbers',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    setImportText(text);
    setImportPreview(null);
  };

  const handlePreviewImport = async () => {
    try {
      setPreviewingImport(true);
      const data = await readJson(
        await fetch('/api/phones/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: importText,
            preview: true,
          }),
        })
      );

      setImportPreview(data.preview || null);
      toast({
        title: 'Preview ready',
        description: 'Import summary generated',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to preview import',
        variant: 'destructive',
      });
    } finally {
      setPreviewingImport(false);
    }
  };

  const handleAssign = async (isBulk = false, assignDate?: string) => {
    try {
      const ids = isBulk ? selectedPhones : [selectedPhone?.id];
      const body: any = {
        ids,
        action: 'assign',
        clientName,
        notes: assignNotes,
      };
      if (assignDate) {
        body.returnDate = assignDate;
      }
      const data = await readJson(
        await fetch('/api/phones/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      );

      toast({
        title: 'Success',
        description: `Assigned ${data.count} phone number(s) to ${clientName}`,
        variant: 'success',
      });
      setAssignDialogOpen(false);
      setClientName('');
      setAssignNotes('');
      setSelectedPhones([]);
      refreshCurrentView();
      fetchBlocks();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to assign phone numbers',
        variant: 'destructive',
      });
    }
  };

  const handleDeassign = async (isBulk = false, returnDate?: string) => {
    try {
      const ids = isBulk ? selectedPhones : [selectedPhone?.id];
      const body: any = {
        ids,
        action: 'deassign',
        notes: assignNotes,
      };
      if (returnDate) {
        body.returnDate = returnDate;
      }
      const data = await readJson(
        await fetch('/api/phones/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      );

      toast({
        title: 'Success',
        description: `Deassigned ${data.count} phone number(s)`,
        variant: 'success',
      });
      setDeassignDialogOpen(false);
      setAssignNotes('');
      setSelectedPhones([]);
      refreshCurrentView();
      fetchBlocks();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to deassign phone numbers',
        variant: 'destructive',
      });
    }
  };

  const handleReassign = async (isBulk = false) => {
    try {
      const ids = isBulk ? selectedPhones : [selectedPhone?.id];
      const data = await readJson(
        await fetch('/api/phones/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids,
            action: 'reassign',
            clientName,
            notes: assignNotes,
          }),
        })
      );

      toast({
        title: 'Success',
        description: `Reassigned ${data.count} phone number(s) to ${clientName}`,
        variant: 'success',
      });
      setReassignDialogOpen(false);
      setClientName('');
      setAssignNotes('');
      setSelectedPhones([]);
      refreshCurrentView();
      fetchBlocks();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reassign phone numbers',
        variant: 'destructive',
      });
    }
  };

  const handleBulkEdit = async () => {
    try {
      if (selectedPhones.length === 0) {
        return;
      }

      const selectedPhonesData = phones.filter((phone) =>
        selectedPhones.includes(phone.id)
      );
      const allSelectedFree = selectedPhonesData.every(
        (phone) => phone.currentStatus === 'KOSONG'
      );

      const action = editClientName.trim()
        ? allSelectedFree
          ? 'assign'
          : 'reassign'
        : 'deassign';

      const data = await readJson(
        await fetch('/api/phones/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: selectedPhones,
            action,
            clientName: editClientName.trim() || undefined,
            notes: 'Bulk manual edit',
          }),
        })
      );

      toast({
        title: 'Success',
        description: `Updated ${data.count} phone number(s)`,
        variant: 'success',
      });
      setEditDialogOpen(false);
      setEditClientName('');
      setSelectedPhones([]);
      refreshCurrentView();
      fetchBlocks();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update selected phone numbers',
        variant: 'destructive',
      });
    }
  };

  const handleDeassignPhone = async (phone: PhoneNumber) => {
    try {
      await readJson(
        await fetch(`/api/phones/${phone.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentStatus: 'KOSONG',
            currentClient: null,
            action: 'deassign',
          }),
        })
      );

      toast({
        title: 'Success',
        description: `Deassigned ${phone.number}`,
        variant: 'success',
      });
      if (selectedBlock) {
        fetchPhonesByPrefix(selectedBlock.prefix);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to deassign phone number',
        variant: 'destructive',
      });
    }
  };

  const handleSelectPhone = (id: string) => {
    setSelectedPhones((previous) =>
      previous.includes(id)
        ? previous.filter((phoneId) => phoneId !== id)
        : [...previous, id]
    );
  };

  const handleSelectAll = () => {
    const filteredPhones = phones.filter((phone) => {
      if (statusFilter === 'ALL') return true;
      return phone.currentStatus === statusFilter;
    });
    const filteredIds = filteredPhones.map((phone) => phone.id);
    const allSelected = filteredIds.every((id) => selectedPhones.includes(id));

    if (allSelected) {
      setSelectedPhones((previous) =>
        previous.filter((id) => !filteredIds.includes(id))
      );
      return;
    }

    setSelectedPhones((previous) => [
      ...new Set([...previous, ...filteredIds]),
    ]);
  };

  const areAllFilteredSelected = () => {
    const filteredPhones = phones.filter((phone) => {
      if (statusFilter === 'ALL') return true;
      return phone.currentStatus === statusFilter;
    });
    if (filteredPhones.length === 0) return false;
    return filteredPhones.every((phone) => selectedPhones.includes(phone.id));
  };

  const fetchPhoneHistory = async (phoneId: string) => {
    try {
      const data = await readJson(
        await fetch(`/api/phones/${phoneId}/history?_=${Date.now()}`, {
          cache: 'no-store',
        })
      );

      setSelectedPhone((previous) => {
        if (!previous) return null;
        return { ...previous, history: data.data || [] };
      });
    } catch {}
  };

  const openHistoryDialog = (phone: PhoneNumber) => {
    setSelectedPhone(phone);
    setHistoryDialogOpen(true);
    fetchPhoneHistory(phone.id);
  };

  const updateHistoryDate = async (historyId: string, newDate: string) => {
    try {
      if (!selectedPhone) return;

      await readJson(
        await fetch(`/api/phones/${selectedPhone.id}/history`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            historyId,
            eventDate: newDate,
          }),
        })
      );

      toast({
        title: 'Success',
        description: 'History date updated successfully',
        variant: 'success',
      });

      setSelectedPhone((previous) => {
        if (!previous) return null;
        const updatedHistory = previous.history.map((entry) =>
          entry.id === historyId ? { ...entry, eventDate: newDate } : entry
        );
        return { ...previous, history: updatedHistory };
      });

      setEditingHistoryId(null);
      setEditingHistoryDate('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update history date',
        variant: 'destructive',
      });
    }
  };

  const startEditHistoryDate = (historyId: string, currentDate: string) => {
    setEditingHistoryId(historyId);
    const date = new Date(currentDate);
    const formatted = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 10);
    setEditingHistoryDate(formatted);
  };

  const deleteHistory = async (historyId: string) => {
    try {
      if (!selectedPhone) return;

      await readJson(
        await fetch(`/api/admin/history/${historyId}`, {
          method: 'DELETE',
        })
      );

      toast({
        title: 'Success',
        description: 'History entry deleted successfully',
        variant: 'success',
      });

      setSelectedPhone((previous) => {
        if (!previous) return null;
        const updatedHistory = previous.history.filter(
          (entry) => entry.id !== historyId
        );
        return { ...previous, history: updatedHistory };
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete history entry',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (phone: PhoneNumber) => {
    setSelectedPhone(phone);
    setEditClientName(phone.currentClient || '');
    setEditDialogOpen(true);
  };

  const openBulkEditDialog = () => {
    setSelectedPhone(null);
    setEditClientName('');
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

      await readJson(
        await fetch(`/api/phones/${selectedPhone.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentStatus: editClientName ? 'PAKAI' : 'KOSONG',
            currentClient: editClientName || null,
            action,
            notes: 'Manual edit',
          }),
        })
      );

      toast({
        title: 'Success',
        description: 'Phone number updated',
        variant: 'success',
      });
      setEditDialogOpen(false);
      refreshCurrentView();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update phone number',
        variant: 'destructive',
      });
    }
  };

  const openCustomersView = () => {
    setViewMode('customers');
    fetchCustomers();
  };

  const setSearchAndReset = (value: string) => {
    setSearch(value);
    setPage(0);
    if (!value.trim() && viewMode === 'blocks') {
      setPhones([]);
      fetchBlocks(false);
    }
  };

  const setStatusFilterAndRefresh = (value: string) => {
    setStatusFilter(value);
    setPage(0);
    if (viewMode === 'detail' && selectedBlock) {
      fetchPhonesByPrefix(selectedBlock.prefix, value);
    }
  };

  return {
    session,
    status,
    router,
    signOut,
    isAdmin,
    limit,
    viewMode,
    setViewMode,
    blocks,
    customers,
    customerPhones,
    selectedCustomer,
    selectedBlock,
    phones,
    loading,
    search,
    statusFilter,
    selectedPhones,
    setSelectedPhones,
    generateDialogOpen,
    setGenerateDialogOpen,
    importDialogOpen,
    setImportDialogOpen,
    assignDialogOpen,
    setAssignDialogOpen,
    deassignDialogOpen,
    setDeassignDialogOpen,
    reassignDialogOpen,
    setReassignDialogOpen,
    historyDialogOpen,
    setHistoryDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editActivationDialogOpen,
    setEditActivationDialogOpen,
    selectedPhone,
    setSelectedPhone,
    selectedBlockForEdit,
    newActivationDate,
    setNewActivationDate,
    userDropdownOpen,
    setUserDropdownOpen,
    silentDeassignDialogOpen,
    setSilentDeassignDialogOpen,
    bulkData,
    setBulkData,
    importText,
    setImportText,
    lastImportSummary,
    setLastImportSummary,
    importPreview,
    setImportPreview,
    importing,
    previewingImport,
    clientName,
    setClientName,
    assignNotes,
    setAssignNotes,
    editClientName,
    setEditClientName,
    editingHistoryId,
    setEditingHistoryId,
    editingHistoryDate,
    setEditingHistoryDate,
    total,
    page,
    setPage,
    setSearchAndReset,
    setStatusFilterAndRefresh,
    fetchPhonesByPrefix,
    handleBlockClick,
    handleCustomerClick,
    handleBackToBlocks,
    handleBackToCustomers,
    handleDeleteBlock,
    handleEditActivationDate,
    handleSaveActivationDate,
    handleGenerate,
    handleImport,
    handleImportFile,
    handlePreviewImport,
    handleAssign,
    handleDeassign,
    handleReassign,
    handleBulkEdit,
    handleDeassignPhone,
    handleSelectPhone,
    handleSelectAll,
    areAllFilteredSelected,
    openHistoryDialog,
    updateHistoryDate,
    startEditHistoryDate,
    deleteHistory,
    openEditDialog,
    openBulkEditDialog,
    handleEdit,
    openCustomersView,
    fetchCustomerPhones,
    fetchBlocks,
  };
}

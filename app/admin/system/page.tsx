'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils';

interface SystemOverview {
  status: 'ok' | 'error';
  checkedAt: string;
  databaseLatencyMs: number;
  counts: {
    users: number;
    inventory: number;
    blocks: number;
    customers: number;
    events: number;
    auditLogs: number;
  };
  lastAudit: {
    action: string;
    createdAt: string;
  } | null;
}

export default function SystemPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/');
    }
  }, [router, session, status]);

  useEffect(() => {
    if (session?.user?.role !== 'admin') {
      return;
    }

    const loadOverview = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/system');
        if (!response.ok) {
          throw new Error('Failed to load system status');
        }
        const data = await response.json();
        setOverview(data);
        setError(null);
      } catch {
        setError('Failed to load system status');
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto' />
          <p className='mt-4 text-gray-600'>Loading system status...</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='mb-8 flex justify-between items-center gap-4'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>System Status</h1>
            <p className='mt-1 text-sm text-gray-600'>
              Operational overview for inventory, users, and audit activity
            </p>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => router.push('/admin/audit')}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            >
              Audit Trail
            </button>
            <button
              onClick={() => router.push('/')}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700'>
            {error}
          </div>
        )}

        {overview && (
          <>
            <div className='grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6'>
              <div className='bg-white rounded-lg shadow p-4'>
                <div className='text-sm text-gray-500'>Users</div>
                <div className='mt-2 text-2xl font-semibold text-gray-900'>{overview.counts.users}</div>
              </div>
              <div className='bg-white rounded-lg shadow p-4'>
                <div className='text-sm text-gray-500'>Inventory</div>
                <div className='mt-2 text-2xl font-semibold text-gray-900'>{overview.counts.inventory}</div>
              </div>
              <div className='bg-white rounded-lg shadow p-4'>
                <div className='text-sm text-gray-500'>Blocks</div>
                <div className='mt-2 text-2xl font-semibold text-gray-900'>{overview.counts.blocks}</div>
              </div>
              <div className='bg-white rounded-lg shadow p-4'>
                <div className='text-sm text-gray-500'>Customers</div>
                <div className='mt-2 text-2xl font-semibold text-gray-900'>{overview.counts.customers}</div>
              </div>
              <div className='bg-white rounded-lg shadow p-4'>
                <div className='text-sm text-gray-500'>Events</div>
                <div className='mt-2 text-2xl font-semibold text-gray-900'>{overview.counts.events}</div>
              </div>
              <div className='bg-white rounded-lg shadow p-4'>
                <div className='text-sm text-gray-500'>Audit Logs</div>
                <div className='mt-2 text-2xl font-semibold text-gray-900'>{overview.counts.auditLogs}</div>
              </div>
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
              <div className='bg-white rounded-lg shadow p-6'>
                <h2 className='text-lg font-semibold text-gray-900'>Health</h2>
                <div className='mt-4 space-y-2 text-sm text-gray-600'>
                  <div>Status: {overview.status}</div>
                  <div>Database latency: {overview.databaseLatencyMs} ms</div>
                  <div>Checked at: {formatDateTime(overview.checkedAt)}</div>
                </div>
              </div>

              <div className='bg-white rounded-lg shadow p-6'>
                <h2 className='text-lg font-semibold text-gray-900'>Recent Audit</h2>
                <div className='mt-4 space-y-2 text-sm text-gray-600'>
                  <div>Last action: {overview.lastAudit?.action || 'No activity yet'}</div>
                  <div>
                    Last update:{' '}
                    {overview.lastAudit?.createdAt
                      ? formatDateTime(overview.lastAudit.createdAt)
                      : '-'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

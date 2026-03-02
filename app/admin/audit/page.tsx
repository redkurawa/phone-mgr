'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

function getAuditSummary(log: AuditLog): string {
  const { action, entityType, payload } = log;
  const p = payload as any;

  // Authentication actions
  if (action === 'auth.sign-in') {
    return 'User signed in';
  }
  if (action === 'auth.register') {
    return `New user registered with role: ${p?.role || 'user'}`;
  }

  // User management actions
  if (action === 'user.status.update') {
    return `Status changed to: ${p?.newStatus || 'unknown'}`;
  }
  if (action === 'user.role.update') {
    return `Role changed to: ${p?.newRole || 'unknown'}`;
  }

  // Phone inventory actions
  if (action === 'inventory.generate') {
    if (p?.range) {
      return `Generated ${p?.requestedCount || 0} numbers from range: ${p.range}`;
    }
    return `Generated ${p?.requestedCount || 0} numbers with prefix: ${p?.prefix}`;
  }
  if (action === 'inventory.import') {
    return `Imported ${p?.insertedCount || 0} of ${p?.uniqueCount || 0} unique numbers`;
  }
  if (action === 'inventory.delete') {
    return `Deleted block: ${p?.prefix || 'unknown'}`;
  }

  // Phone assignment actions
  if (action === 'phone.assign') {
    return `Assigned to client: ${p?.clientName || 'unknown'}`;
  }
  if (action === 'phone.deassign') {
    return 'Deassigned from client';
  }
  if (action === 'phone.reassign') {
    return `Reassigned to client: ${p?.clientName || 'unknown'}`;
  }
  if (action === 'phone.edit') {
    return `Edited phone details`;
  }

  // Bulk actions
  if (action === 'phone.bulk.assign') {
    return `Bulk assigned ${p?.count || 0} phones to: ${p?.clientName || 'unknown'}`;
  }
  if (action === 'phone.bulk.deassign') {
    return `Bulk deassigned ${p?.count || 0} phones`;
  }
  if (action === 'phone.bulk.reassign') {
    return `Bulk reassigned ${p?.count || 0} phones to: ${p?.clientName || 'unknown'}`;
  }

  // Block activation
  if (action === 'block.activation.update') {
    return `Activation date updated to: ${p?.activationDate || 'none'}`;
  }

  // History date edit
  if (action === 'history.date.update') {
    return `History date updated to: ${p?.newDate || 'unknown'}`;
  }

  return action;
}

export default function AuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
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

    const loadLogs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/audit?limit=200');
        if (!response.ok) {
          throw new Error('Failed to load audit logs');
        }
        const data = await response.json();
        setLogs(data.logs || []);
        setError(null);
      } catch {
        setError('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    void loadLogs();
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto' />
          <p className='mt-4 text-gray-600'>Loading audit trail...</p>
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
            <h1 className='text-3xl font-bold text-gray-900'>Audit Trail</h1>
            <p className='mt-1 text-sm text-gray-600'>
              Recent actions across authentication, inventory, and
              administration
            </p>
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => router.push('/admin/system')}
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            >
              System Status
            </button>
            <button
              onClick={() =>
                window.open(
                  '/api/admin/backup',
                  '_blank',
                  'noopener,noreferrer'
                )
              }
              className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
            >
              Download Backup
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

        <div className='bg-white rounded-lg shadow overflow-hidden'>
          {logs.length === 0 ? (
            <div className='p-6 text-center text-gray-500'>
              No audit entries yet.
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Time
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Action
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actor
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Entity
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Summary
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {formatDate(log.createdAt)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                        {log.action}
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-500'>
                        <div>{log.actor?.name || 'System'}</div>
                        <div className='text-xs text-gray-400'>
                          {log.actor?.email || '-'}
                        </div>
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-500'>
                        <div>{log.entityType}</div>
                        <div className='text-xs text-gray-400 break-all'>
                          {log.entityId}
                        </div>
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-500'>
                        <div className='max-w-md'>
                          <div className='font-medium text-gray-900 mb-1'>
                            {getAuditSummary(log)}
                          </div>
                          <div className='text-xs text-gray-400 bg-gray-50 p-2 rounded overflow-x-auto'>
                            <pre className='whitespace-pre-wrap break-all'>
                              {JSON.stringify(log.payload ?? {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

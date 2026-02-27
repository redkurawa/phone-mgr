'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (
    userId: string,
    newStatus: 'approved' | 'rejected'
  ) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update user');
      fetchUsers();
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!response.ok) throw new Error('Failed to update role');
      fetchUsers();
    } catch (err) {
      setError('Failed to update user role');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'admin') {
    return null;
  }

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved');
  const rejectedUsers = users.filter((u) => u.status === 'rejected');

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='mb-8 flex justify-between items-center'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>
              User Management
            </h1>
            <p className='mt-1 text-sm text-gray-600'>
              Manage user accounts and permissions
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700'>
            {error}
          </div>
        )}

        {/* Pending Users */}
        <div className='mb-8'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
            <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 text-sm font-bold mr-2'>
              {pendingUsers.length}
            </span>
            Pending Approval
          </h2>
          {pendingUsers.length === 0 ? (
            <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>
              No pending users
            </div>
          ) : (
            <div className='bg-white rounded-lg shadow overflow-hidden'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      User
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Email
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Created
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {pendingUsers.map((user) => (
                    <tr key={user.id}>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center'>
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name || 'User'}
                                className='h-10 w-10 rounded-full'
                                referrerPolicy='no-referrer'
                              />
                            ) : (
                              <span className='text-blue-600 font-medium'>
                                {user.name?.charAt(0).toUpperCase() ||
                                  user.email.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {user.name || 'No name'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {user.email}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2'>
                        <button
                          onClick={() => updateUserStatus(user.id, 'approved')}
                          className='text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md'
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateUserStatus(user.id, 'rejected')}
                          className='text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md'
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Approved Users */}
        <div className='mb-8'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
            <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-sm font-bold mr-2'>
              {approvedUsers.length}
            </span>
            Approved Users
          </h2>
          {approvedUsers.length === 0 ? (
            <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>
              No approved users
            </div>
          ) : (
            <div className='bg-white rounded-lg shadow overflow-hidden'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      User
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Email
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Role
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Created
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {approvedUsers.map((user) => (
                    <tr key={user.id}>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center'>
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name || 'User'}
                                className='h-10 w-10 rounded-full'
                                referrerPolicy='no-referrer'
                              />
                            ) : (
                              <span className='text-blue-600 font-medium'>
                                {user.name?.charAt(0).toUpperCase() ||
                                  user.email.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-900'>
                              {user.name || 'No name'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {user.email}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <select
                          value={user.role}
                          onChange={(e) =>
                            updateUserRole(
                              user.id,
                              e.target.value as 'admin' | 'user'
                            )
                          }
                          className='text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500'
                          disabled={user.id === session?.user?.id}
                        >
                          <option value='user'>User</option>
                          <option value='admin'>Admin</option>
                        </select>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        {user.id !== session?.user?.id && (
                          <button
                            onClick={() =>
                              updateUserStatus(user.id, 'rejected')
                            }
                            className='text-red-600 hover:text-red-900'
                          >
                            Revoke Access
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rejected Users */}
        {rejectedUsers.length > 0 && (
          <div>
            <h2 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
              <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-sm font-bold mr-2'>
                {rejectedUsers.length}
              </span>
              Rejected Users
            </h2>
            <div className='bg-white rounded-lg shadow overflow-hidden'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      User
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Email
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Created
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {rejectedUsers.map((user) => (
                    <tr key={user.id} className='bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center'>
                            {user.image ? (
                              <img
                                src={user.image}
                                alt={user.name || 'User'}
                                className='h-10 w-10 rounded-full opacity-50'
                                referrerPolicy='no-referrer'
                              />
                            ) : (
                              <span className='text-gray-400 font-medium'>
                                {user.name?.charAt(0).toUpperCase() ||
                                  user.email.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className='ml-4'>
                            <div className='text-sm font-medium text-gray-500'>
                              {user.name || 'No name'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-400'>
                        {user.email}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-400'>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                        <button
                          onClick={() => updateUserStatus(user.id, 'approved')}
                          className='text-green-600 hover:text-green-900'
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

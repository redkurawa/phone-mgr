'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function WaitingPage() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='text-center max-w-md px-4'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto'></div>
        <h1 className='mt-6 text-2xl font-semibold text-gray-900'>
          Waiting for Approval
        </h1>
        <p className='mt-2 text-gray-600'>
          Your account is pending admin approval. Please wait for an
          administrator to approve your access.
        </p>
        <p className='mt-4 text-sm text-gray-500'>
          This page will automatically update once your account is approved.
        </p>
        <Button
          className='mt-6'
          variant='outline'
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Back to Login
        </Button>
      </div>
    </div>
  );
}

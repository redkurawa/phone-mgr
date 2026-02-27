"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function WaitingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && session?.user?.status === "approved") {
            router.push("/");
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
                        <svg
                            className="h-8 w-8 text-yellow-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Awaiting Approval
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Your account is pending administrator approval
                    </p>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-blue-600 font-medium">
                                        {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {session?.user?.name || "User"}
                                </p>
                                <p className="text-xs text-gray-500">{session?.user?.email}</p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <p className="text-sm text-gray-600">
                                You have successfully signed in with Google, but your account needs to be approved by an administrator before you can access the system.
                            </p>
                        </div>

                        <div className="bg-yellow-50 rounded-lg p-4">
                            <h3 className="text-sm font-medium text-yellow-800 mb-2">
                                What happens next?
                            </h3>
                            <ul className="text-xs text-yellow-700 space-y-1">
                                <li>• An administrator will review your account</li>
                                <li>• Once approved, you'll be able to access the system</li>
                                <li>• You may need to sign in again after approval</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                        Sign out and use a different account
                    </button>
                </div>
            </div>
        </div>
    );
}

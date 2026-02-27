import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const { pathname } = req.nextUrl;
        const token = req.nextauth.token;

        // Redirect pending users to waiting page
        if (token?.status === "pending" && pathname !== "/waiting") {
            return NextResponse.redirect(new URL("/waiting", req.url));
        }

        // Redirect rejected users to login
        if (token?.status === "rejected") {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        // Protect admin routes
        if (pathname.startsWith("/admin") && token?.role !== "admin") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: "/login",
        },
    }
);

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - login (login page)
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
    ],
};

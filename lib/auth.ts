import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { neon } from '@neondatabase/serverless';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: 'admin' | 'user';
      status: 'pending' | 'approved' | 'rejected';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'rejected';
    image?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      const sql = neon(process.env.DATABASE_URL!);

      // Check if user exists
      const existingUsers = await sql`
                SELECT * FROM users WHERE email = ${user.email}
            `;

      if (existingUsers.length === 0) {
        // Check if this is the first user (make them admin)
        const allUsers = await sql`SELECT COUNT(*) as count FROM users`;
        const count = Number(allUsers[0].count);
        const isFirstUser = count === 0;
        console.log('First user check:', {
          count,
          isFirstUser,
          email: user.email,
        });

        // Create new user
        await sql`
                    INSERT INTO users (email, name, image, role, status)
                    VALUES (${user.email}, ${user.name || null}, ${user.image || null}, ${isFirstUser ? 'admin' : 'user'}, ${isFirstUser ? 'approved' : 'pending'})
                `;
        console.log('User created:', {
          email: user.email,
          role: isFirstUser ? 'admin' : 'user',
          status: isFirstUser ? 'approved' : 'pending',
        });
      } else {
        // Update existing user's info
        await sql`
                    UPDATE users 
                    SET name = ${user.name || null}, image = ${user.image || null}, updated_at = NOW()
                    WHERE email = ${user.email}
                `;
        console.log('User updated:', {
          email: user.email,
          role: existingUsers[0].role,
          status: existingUsers[0].status,
        });
      }

      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      // Always fetch fresh user data from database
      const email = user?.email || token.email;
      if (email) {
        const sql = neon(process.env.DATABASE_URL!);
        const users = await sql`
                    SELECT id, role, status, image FROM users WHERE email = ${email}
                `;

        if (users.length > 0) {
          token.id = users[0].id;
          token.role = users[0].role;
          token.status = users[0].status;
          // Use database image, or fallback to OAuth user image (for first login)
          token.image = users[0].image || user?.image || null;
          console.log('JWT callback - user data:', {
            id: users[0].id,
            role: users[0].role,
            status: users[0].status,
            image: token.image,
          });
        } else if (user?.image) {
          // New user - use image directly from OAuth provider
          token.image = user.image;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.image = token.image || null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper function to check if user is admin
export async function isAdmin(email: string): Promise<boolean> {
  const sql = neon(process.env.DATABASE_URL!);
  const users = await sql`
    SELECT role FROM users WHERE email = ${email}
  `;
  return users.length > 0 && users[0].role === 'admin';
}

// Helper function to check if user is approved
export async function isApproved(email: string): Promise<boolean> {
  const sql = neon(process.env.DATABASE_URL!);
  const users = await sql`
    SELECT status FROM users WHERE email = ${email}
  `;
  return users.length > 0 && users[0].status === 'approved';
}

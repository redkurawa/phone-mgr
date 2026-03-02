import { getServerSession, type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { NextResponse } from 'next/server';
import {
  requireDatabase,
  toJsonPayload,
  type UserRole,
  type UserStatus,
} from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      status: UserStatus;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    status: UserStatus;
    image?: string | null;
  }
}

async function syncOAuthUser(user: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}) {
  console.log(`syncOAuthUser called for: ${user.email}`);
  if (!user.email) {
    console.log('syncOAuthUser: no email provided');
    return null;
  }

  try {
    const sql = requireDatabase();
    const existingUsers = await sql`
    SELECT
      id,
      role::text AS role,
      status::text AS status,
      image
    FROM app_users
    WHERE email = ${user.email}
    LIMIT 1
  `;

    console.log(`syncOAuthUser: existingUsers found=${!!existingUsers[0]}`);
    if (existingUsers[0]) {
      console.log(
        `syncOAuthUser: updating existing user ${existingUsers[0].id}`
      );
      const [updatedUser] = await sql`
      UPDATE app_users
      SET
        name = ${user.name ?? null},
        image = ${user.image ?? null},
        last_login_at = NOW(),
        updated_at = NOW()
      WHERE email = ${user.email}
      RETURNING
        id,
        role::text AS role,
        status::text AS status,
        image
    `;

      await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
      VALUES (
        'auth.sign-in',
        'app_user',
        ${updatedUser.id},
        ${updatedUser.id},
        CAST(${toJsonPayload({ email: user.email })} AS jsonb)
      )
    `;

      return updatedUser;
    }

    const [countRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM app_users
  `;

    const isFirstUser = Number(countRow?.count ?? 0) === 0;
    const role = isFirstUser ? 'admin' : 'user';
    const status = isFirstUser ? 'approved' : 'pending';
    console.log(
      `Creating new user: ${user.email}, isFirstUser=${isFirstUser}, role=${role}, status=${status}`
    );

    const [createdUser] = await sql`
    INSERT INTO app_users (
      email,
      name,
      image,
      role,
      status,
      last_login_at
    )
    VALUES (
      ${user.email},
      ${user.name ?? null},
      ${user.image ?? null},
      ${role}::app_role,
      ${status}::app_user_status,
      NOW()
    )
    RETURNING
      id,
      role::text AS role,
      status::text AS status,
      image
  `;

    await sql`
    INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
    VALUES (
      'auth.register',
      'app_user',
      ${createdUser.id},
      ${createdUser.id},
      CAST(${toJsonPayload({
        email: user.email,
        role,
        status,
      })} AS jsonb)
    )
  `;

    console.log(
      `Created user: ${createdUser.id}, status=${createdUser.status}`
    );
    return createdUser;
  } catch (error: any) {
    console.error('syncOAuthUser error:', error);
    return null;
  }
}

async function loadAppUser(email?: string | null) {
  console.log(`loadAppUser called for: ${email}`);
  if (!email) {
    return null;
  }

  const sql = requireDatabase();
  const [user] = await sql`
    SELECT
      id,
      role::text AS role,
      status::text AS status,
      image
    FROM app_users
    WHERE email = ${email}
    LIMIT 1
  `;

  console.log(
    `loadAppUser result for ${email}:`,
    user ? `found, status=${user.status}` : 'not found'
  );
  return user ?? null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user }) {
      try {
        const syncedUser = await syncOAuthUser(user);
        console.log(
          'signIn result:',
          syncedUser ? 'success' : 'failed',
          'for',
          user.email
        );
        if (!syncedUser) {
          return false;
        }
        // Allow login for all users - middleware will handle pending users
        return true;
      } catch (error: any) {
        console.error('signIn error:', error);
        return false;
      }
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email ?? null;
      console.log(`JWT callback: email=${email}, hasUser=${!!user}`);
      const appUser = await loadAppUser(email);
      if (appUser) {
        console.log(`JWT: loaded user ${appUser.id}, status=${appUser.status}`);
        token.id = appUser.id;
        token.role = appUser.role as UserRole;
        token.status = appUser.status as UserStatus;
        token.image = appUser.image ?? user?.image ?? token.image ?? null;
      } else {
        console.log(`JWT: no appUser found for ${email}`);
      }
      return token;
    },
    async session({ session, token }) {
      console.log(
        `Session callback: token.status=${token.status}, token.role=${token.role}`
      );
      if (session.user && token.email) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as UserStatus;
        session.user.image = token.image ?? null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function ensureApprovedSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return {
      session: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (session.user.status !== 'approved') {
    return {
      session: null,
      response: NextResponse.json({ error: 'Access revoked' }, { status: 403 }),
    };
  }

  return { session, response: null };
}

export async function ensureAdminSession() {
  const approval = await ensureApprovedSession();
  if (approval.response) {
    return approval;
  }

  if (approval.session?.user.role !== 'admin') {
    return {
      session: null,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return approval;
}

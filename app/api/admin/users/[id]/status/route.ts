import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { status } = await request.json();

        if (!["approved", "rejected", "pending"].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // Prevent admin from changing their own status
        if (params.id === session.user.id) {
            return NextResponse.json(
                { error: "Cannot change your own status" },
                { status: 400 }
            );
        }

        const sql = neon(process.env.DATABASE_URL!);

        await sql`
      UPDATE users 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${params.id}
    `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating user status:", error);
        return NextResponse.json(
            { error: "Failed to update user status" },
            { status: 500 }
        );
    }
}

/**
 * Article Categories API
 *
 * GET  /api/articles/categories → List user categories
 * POST /api/articles/categories → Create category
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { articleCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureAuthenticatedUser } from "@/lib/auth/ensure-user";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET() {
  const userId = await ensureAuthenticatedUser();

  try {
    const result = await db
      .select()
      .from(articleCategories)
      .where(eq(articleCategories.userId, userId))
      .orderBy(articleCategories.name);

    return NextResponse.json({ categories: result });
  } catch (error) {
    console.error("[Article Categories] List error:", error);
    return NextResponse.json(
      { error: "Failed to list categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const userId = await ensureAuthenticatedUser();

  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    const slug = slugify(name.trim());

    // Check duplicate
    const [existing] = await db
      .select({ id: articleCategories.id })
      .from(articleCategories)
      .where(
        and(
          eq(articleCategories.userId, userId),
          eq(articleCategories.slug, slug),
        ),
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 },
      );
    }

    const [category] = await db
      .insert(articleCategories)
      .values({
        userId,
        name: name.trim(),
        slug,
        color: color || "#a3e635",
      })
      .returning();

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("[Article Categories] Create error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}

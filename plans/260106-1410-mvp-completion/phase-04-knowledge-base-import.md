# Phase 04: Knowledge Base Import

**Status**: pending | **Effort**: 2-3h

## Objective

Import Internal_Knowledge sheet to KnowledgeItem table. Create simple keyword search API.

---

## Tasks

### 4.1 Knowledge Sheet Mapper (30m)

**File**: `src/lib/knowledge-mapper.ts`

Assuming Internal_Knowledge sheet columns:
- A: Category (Policy, FAQ, Template, etc.)
- B: Title
- C: Content
- D: Keywords (comma-separated)

```typescript
import { prisma } from '@/lib/db';

export interface KnowledgeRow {
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

export function mapKnowledgeRow(row: string[], rowIndex: number): KnowledgeRow | null {
  const [category, title, content, keywordsStr] = row;

  if (!category || !title || !content) return null;

  return {
    category: category.trim(),
    title: title.trim(),
    content: content.trim(),
    keywords: keywordsStr
      ? keywordsStr.split(',').map(k => k.trim().toLowerCase())
      : [],
  };
}

export async function syncKnowledgeItem(data: KnowledgeRow, rowIndex: number) {
  // Upsert by title (or create composite key)
  return prisma.knowledgeItem.upsert({
    where: {
      // Use title as unique key (add @@unique([title]) to schema if needed)
      id: await findIdByTitle(data.title),
    },
    update: {
      category: data.category,
      content: data.content,
      keywords: data.keywords,
      sheetRowIndex: rowIndex,
      updatedAt: new Date(),
    },
    create: {
      category: data.category,
      title: data.title,
      content: data.content,
      keywords: data.keywords,
      sheetRowIndex: rowIndex,
      isActive: true,
    },
  });
}

async function findIdByTitle(title: string): Promise<string> {
  const existing = await prisma.knowledgeItem.findFirst({
    where: { title },
  });
  return existing?.id || 'new-' + Date.now(); // Fallback for create
}
```

---

### 4.2 Knowledge Sync Endpoint (30m)

**File**: `src/app/api/sync/knowledge/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasPermission, type Role } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { getSheetData } from '@/lib/google-sheets';
import { mapKnowledgeRow } from '@/lib/knowledge-mapper';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user.role as Role, '*')) {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const rows = await getSheetData('Internal_Knowledge', 2);
    let synced = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const data = mapKnowledgeRow(row.values, row.rowIndex);
        if (!data) continue;

        await prisma.knowledgeItem.upsert({
          where: { title: data.title },
          update: {
            category: data.category,
            content: data.content,
            keywords: data.keywords,
            sheetRowIndex: row.rowIndex,
          },
          create: {
            category: data.category,
            title: data.title,
            content: data.content,
            keywords: data.keywords,
            sheetRowIndex: row.rowIndex,
            isActive: true,
          },
        });
        synced++;
      } catch (error) {
        console.error('Knowledge sync error:', error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} knowledge items, ${errors} errors`,
      synced,
      errors,
    });
  } catch (error) {
    console.error('Knowledge sync failed:', error);
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 });
  }
}
```

**Note**: Add unique constraint to schema:

```prisma
model KnowledgeItem {
  // ... existing fields
  title String @unique  // Add this
}
```

---

### 4.3 Knowledge Search API (45m)

**File**: `src/app/api/knowledge/search/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query && !category) {
      return NextResponse.json({ success: false, error: 'Query or category required' }, { status: 400 });
    }

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    // Search in title, content, and keywords
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { keywords: { has: query } },
      ];
    }

    const items = await prisma.knowledgeItem.findMany({
      where,
      select: {
        id: true,
        category: true,
        title: true,
        content: true,
        keywords: true,
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error('Knowledge search error:', error);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
```

---

### 4.4 Knowledge Search Library (30m)

**File**: `src/lib/knowledge-search.ts`

```typescript
import { prisma } from '@/lib/db';

export interface KnowledgeResult {
  id: string;
  category: string;
  title: string;
  content: string;
  score: number; // Relevance score
}

/**
 * Search knowledge base by keywords
 * Simple scoring: title match > keyword match > content match
 */
export async function searchKnowledge(
  query: string,
  limit: number = 5
): Promise<KnowledgeResult[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  if (terms.length === 0) return [];

  const items = await prisma.knowledgeItem.findMany({
    where: { isActive: true },
    select: {
      id: true,
      category: true,
      title: true,
      content: true,
      keywords: true,
    },
  });

  // Score each item
  const scored = items.map(item => {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const contentLower = item.content.toLowerCase();

    for (const term of terms) {
      // Title match (high weight)
      if (titleLower.includes(term)) score += 10;
      // Keyword match (medium weight)
      if (item.keywords.some(k => k.includes(term))) score += 5;
      // Content match (low weight)
      if (contentLower.includes(term)) score += 1;
    }

    return { ...item, score };
  });

  // Sort by score and return top results
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get knowledge context for AI prompt
 */
export async function getKnowledgeContext(query: string): Promise<string> {
  const results = await searchKnowledge(query, 3);

  if (results.length === 0) {
    return 'Không tìm thấy thông tin liên quan trong Knowledge Base.';
  }

  return results
    .map(r => `## ${r.title}\n${r.content}`)
    .join('\n\n---\n\n');
}
```

---

## Verification

- [ ] `/api/sync/knowledge` imports from sheet
- [ ] KnowledgeItem table has data
- [ ] `/api/knowledge/search?q=visa` returns results
- [ ] `searchKnowledge()` returns ranked results
- [ ] `getKnowledgeContext()` formats for AI

## Schema Update

Add to `prisma/schema.prisma`:

```prisma
model KnowledgeItem {
  // ... existing fields
  title String @unique  // Make title unique for upsert
}
```

Run: `npx prisma db push`

## Output

- `src/lib/knowledge-mapper.ts`
- `src/app/api/sync/knowledge/route.ts`
- `src/app/api/knowledge/search/route.ts`
- `src/lib/knowledge-search.ts`

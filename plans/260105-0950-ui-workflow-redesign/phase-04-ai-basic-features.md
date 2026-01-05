# Phase 4: AI Basic Features

## Context

- Parent: [plan.md](./plan.md)
- Depends on: [Phase 3](./phase-03-accounting-admin.md) (Accounting & Admin)
- Brainstorm: [Requirements](../reports/brainstorm-260105-0950-ui-workflow-redesign.md)

## Overview

| Field | Value |
|-------|-------|
| Description | Follow-up reminders, notification badge system, knowledge base chat widget |
| Priority | P2 |
| Status | Pending |
| Review | Not started |

## Key Insights

1. **Cron-based reminders**: Check nextFollowUp daily, generate notifications
2. **In-app notifications**: Badge count in header, dropdown list
3. **Knowledge base chat**: Query KnowledgeItem table, Claude API for responses
4. **Incremental AI**: Start basic, add complexity in future phases

## Requirements

### R1: Follow-up Reminder Service
- Daily cron job checks requests where nextFollowUp <= today
- Creates notification records for seller
- Marks overdue requests (highlight in UI)
- Optional: Daily email digest

### R2: Notification System
- Notification model: type, message, isRead, userId, link
- Badge count in Header (unread count)
- Dropdown panel with notification list
- Mark as read on click

### R3: Knowledge Base Chat Widget
- Floating chat button (bottom-right)
- Chat interface in Sheet/Dialog
- Query KnowledgeItem by keywords
- Send context to Claude API for response
- Display formatted response

## Architecture Decisions

### AD1: Notification Schema
```prisma
model Notification {
  id        String   @id @default(cuid())
  type      String   // FOLLOW_UP_DUE, PAYMENT_PENDING, CLAIM_AVAILABLE, SYSTEM
  title     String
  message   String
  link      String?  // URL to navigate
  isRead    Boolean  @default(false)

  userId    String
  user      User     @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
  @@map("notifications")
}
```

### AD2: Cron Job Strategy
- Use Vercel Cron or external service (e.g., cron-job.org)
- Endpoint: `/api/cron/follow-up-check`
- Protected by CRON_SECRET header
- Runs daily at 08:00 VN time

### AD3: Knowledge Base Chat Flow
```
User Input → Extract Keywords → Search KnowledgeItem →
Top 3 Results as Context → Claude API → Formatted Response
```

## Related Code Files

**Schema updates:**
- `prisma/schema.prisma` - Add Notification model

**New files:**
- `src/app/api/cron/follow-up-check/route.ts` - Cron endpoint
- `src/app/api/notifications/route.ts` - List notifications
- `src/app/api/notifications/[id]/read/route.ts` - Mark read
- `src/app/api/chat/route.ts` - Chat endpoint
- `src/components/layout/NotificationBell.tsx` - Header bell icon
- `src/components/layout/NotificationDropdown.tsx` - Dropdown list
- `src/components/chat/ChatWidget.tsx` - Chat button + panel
- `src/components/chat/ChatMessage.tsx` - Message bubble
- `src/lib/ai/knowledge-search.ts` - Search helper

**Existing (modify):**
- `src/components/layout/Header.tsx` - Add NotificationBell
- `src/components/layout/AIAssistant.tsx` - Replace with ChatWidget

## Implementation Steps

### Step 1: Notification Schema
Add to `prisma/schema.prisma`:
```prisma
model User {
  // ... existing
  notifications Notification[]
}

model Notification {
  // ... as defined above
}
```
```bash
npx prisma migrate dev --name add_notification_model
```

### Step 2: Follow-up Check Cron
Create `src/app/api/cron/follow-up-check/route.ts`:
```typescript
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find overdue follow-ups
  const overdueRequests = await prisma.request.findMany({
    where: {
      nextFollowUp: { lte: new Date() },
      stage: { not: 'OUTCOME' }
    },
    include: { seller: true }
  });

  // Create notifications
  const notifications = overdueRequests.map(req => ({
    type: 'FOLLOW_UP_DUE',
    title: `Follow-up quá hạn: ${req.customerName}`,
    message: `Yêu cầu ${req.rqid || req.code} cần follow-up`,
    link: `/requests?id=${req.id}`,
    userId: req.sellerId
  }));

  await prisma.notification.createMany({ data: notifications });

  return Response.json({ created: notifications.length });
}
```

### Step 3: Vercel Cron Configuration
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/follow-up-check",
      "schedule": "0 1 * * *"
    }
  ]
}
```
Add `CRON_SECRET` to env.

### Step 4: Notification API Endpoints
Create `src/app/api/notifications/route.ts`:
```typescript
// GET - List user's notifications (unread first)
export async function GET() {
  const session = await auth();
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    take: 20
  });
  return Response.json({ success: true, data: notifications });
}
```

Create `src/app/api/notifications/[id]/read/route.ts`:
```typescript
// POST - Mark notification as read
export async function POST(req, { params }) {
  await prisma.notification.update({
    where: { id: params.id },
    data: { isRead: true }
  });
  return Response.json({ success: true });
}
```

### Step 5: Notification Bell Component
Create `src/components/layout/NotificationBell.tsx`:
```typescript
export function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(d => setNotifications(d.data));
    // Poll every 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <NotificationDropdown notifications={notifications} />
      </PopoverContent>
    </Popover>
  );
}
```

### Step 6: Update Header
Modify `src/components/layout/Header.tsx`:
- Import and add NotificationBell next to user menu
- Position between nav and user dropdown

### Step 7: Knowledge Search Helper
Create `src/lib/ai/knowledge-search.ts`:
```typescript
export async function searchKnowledge(query: string) {
  // Simple keyword search (upgrade to vector later)
  const keywords = query.toLowerCase().split(' ');

  const items = await prisma.knowledgeItem.findMany({
    where: {
      isActive: true,
      OR: keywords.map(kw => ({
        OR: [
          { title: { contains: kw, mode: 'insensitive' } },
          { content: { contains: kw, mode: 'insensitive' } },
          { keywords: { has: kw } }
        ]
      }))
    },
    take: 3
  });

  return items;
}
```

### Step 8: Chat API Endpoint
Create `src/app/api/chat/route.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { searchKnowledge } from '@/lib/ai/knowledge-search';

const anthropic = new Anthropic();

export async function POST(req: Request) {
  const { message } = await req.json();

  // Search knowledge base
  const context = await searchKnowledge(message);
  const contextText = context.map(k => `${k.title}: ${k.content}`).join('\n\n');

  // Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: `Bạn là trợ lý AI của VivaTour. Trả lời dựa trên thông tin sau:\n${contextText}`,
    messages: [{ role: 'user', content: message }]
  });

  const reply = response.content[0].type === 'text' ? response.content[0].text : '';

  return Response.json({ success: true, reply });
}
```

### Step 9: Chat Widget Component
Create `src/components/chat/ChatWidget.tsx`:
- Floating button (bottom-right, fixed position)
- Click opens Sheet from right
- Chat input at bottom
- Messages scroll area
- Loading state while AI responds

### Step 10: Replace AIAssistant
Update existing `AIAssistant.tsx` or replace with ChatWidget:
- Remove placeholder implementation
- Use new chat API
- Maintain floating button UX

### Step 11: Environment Variables
Add to `.env`:
```env
CRON_SECRET=<generate-secret>
ANTHROPIC_API_KEY=<your-key>
```

## Todo List

- [ ] Add Notification model to schema
- [ ] Run prisma migrate
- [ ] Create follow-up check cron endpoint
- [ ] Add vercel.json cron config
- [ ] Create notification list API
- [ ] Create mark-read API
- [ ] Create NotificationBell component
- [ ] Create NotificationDropdown component
- [ ] Update Header with notification bell
- [ ] Create knowledge search helper
- [ ] Create chat API endpoint
- [ ] Create ChatWidget component
- [ ] Create ChatMessage component
- [ ] Replace/Update AIAssistant
- [ ] Add CRON_SECRET env
- [ ] Add ANTHROPIC_API_KEY env
- [ ] Test cron endpoint manually
- [ ] Test chat responses

## Success Criteria

- [ ] Cron creates notifications for overdue follow-ups
- [ ] Badge shows unread count
- [ ] Clicking notification marks as read
- [ ] Clicking notification navigates to request
- [ ] Chat widget opens from floating button
- [ ] Chat queries knowledge base
- [ ] AI response is relevant to query

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude API costs | Medium | Rate limit, cache common queries |
| Cron timing issues | Low | Log execution, retry on failure |
| Notification spam | Low | Deduplicate per day per request |
| Poor knowledge search | Medium | Upgrade to vector search later |

## Security Considerations

- Cron endpoint protected by secret
- Chat API rate limited per user
- Notifications filtered by user ID
- Claude API key server-side only
- Sanitize user input before AI query

## Future Enhancements (Phase 5+)

1. **Email/Telegram notifications**: Integrate external delivery
2. **Vector search**: Upgrade knowledge search with embeddings
3. **AI email parsing**: Auto-create requests from emails
4. **Suggested responses**: AI drafts for common queries
5. **Daily admin summary**: AI-generated daily report

## Next Steps

After Phase 4:
1. User acceptance testing
2. Performance optimization
3. Deploy to production
4. Plan Phase 5 (Advanced AI features)

# Phase 05: AI Chat Integration

**Status**: pending | **Effort**: 3-4h

## Objective

Connect Claude API to AIAssistant widget. Inject knowledge context into prompts.

---

## Tasks

### 5.1 AI Chat API Endpoint (1.5h)

**File**: `src/app/api/ai/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import Anthropic from '@anthropic-ai/sdk';
import { getKnowledgeContext } from '@/lib/knowledge-search';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `Bạn là AI Assistant của MyVivaTour - công ty du lịch Việt Nam.

Nhiệm vụ của bạn:
1. Trả lời câu hỏi về chính sách công ty, tour du lịch, thủ tục visa
2. Giúp soạn email trả lời khách hàng bằng tiếng Anh hoặc tiếng Việt
3. Cung cấp thông tin chính xác từ Knowledge Base

Nguyên tắc:
- Trả lời ngắn gọn, chuyên nghiệp
- Nếu không chắc, nói "Tôi không có thông tin về vấn đề này"
- Khi soạn email, format rõ ràng với greeting và signature
- Sử dụng thông tin từ Knowledge Base được cung cấp`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history = [] } = await request.json() as {
      message: string;
      history: ChatMessage[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 });
    }

    // Get relevant knowledge context
    const knowledgeContext = await getKnowledgeContext(message);

    // Build messages with context
    const messages: Anthropic.MessageParam[] = [
      // Include history (last 10 messages)
      ...history.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      // Current message with knowledge context
      {
        role: 'user' as const,
        content: `Knowledge Base Context:\n${knowledgeContext}\n\n---\n\nUser Question: ${message}`,
      },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Không thể xử lý yêu cầu.';

    return NextResponse.json({
      success: true,
      data: {
        message: assistantMessage,
        usage: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      },
    });

  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { success: false, error: 'AI service error' },
      { status: 500 }
    );
  }
}
```

---

### 5.2 Update AIAssistant Component (1.5h)

**File**: `src/components/layout/AIAssistant.tsx`

Replace the simulated response with real API call:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Minimize2, Maximize2, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Xin chào! Tôi là AI Assistant của MyVivaTour. Tôi có thể giúp bạn soạn email, trả lời câu hỏi về chính sách, hoặc tìm kiếm thông tin từ Knowledge Base.',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'AI error');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('AI error:', error);
      toast.error('Không thể kết nối AI. Vui lòng thử lại.');

      // Add error message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Đã copy vào clipboard');
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        'fixed bottom-6 right-6 shadow-2xl transition-all duration-300 z-50 flex flex-col',
        isMinimized ? 'w-80 h-14' : 'w-96 h-[500px]'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 border-b shrink-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Assistant
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex flex-col gap-1',
                  message.role === 'user' ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 max-w-[85%] text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'assistant' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleCopy(message.content)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-3 border-t shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}
```

---

### 5.3 Token Usage Tracking (Optional) (30m)

**File**: `src/lib/ai-usage.ts`

```typescript
import { prisma } from '@/lib/db';

// Simple usage tracking (can store in DB later)
let dailyUsage = {
  date: new Date().toDateString(),
  inputTokens: 0,
  outputTokens: 0,
  requests: 0,
};

const DAILY_LIMIT = 100000; // 100k tokens/day

export function trackUsage(input: number, output: number) {
  const today = new Date().toDateString();

  if (dailyUsage.date !== today) {
    // Reset for new day
    dailyUsage = { date: today, inputTokens: 0, outputTokens: 0, requests: 0 };
  }

  dailyUsage.inputTokens += input;
  dailyUsage.outputTokens += output;
  dailyUsage.requests++;

  console.log(`AI Usage: ${dailyUsage.inputTokens + dailyUsage.outputTokens} tokens today`);
}

export function checkLimit(): boolean {
  const today = new Date().toDateString();
  if (dailyUsage.date !== today) return true;

  return (dailyUsage.inputTokens + dailyUsage.outputTokens) < DAILY_LIMIT;
}

export function getUsage() {
  return { ...dailyUsage };
}
```

Use in API:
```typescript
import { trackUsage, checkLimit } from '@/lib/ai-usage';

// Before calling Claude
if (!checkLimit()) {
  return NextResponse.json({ success: false, error: 'Daily limit reached' }, { status: 429 });
}

// After response
trackUsage(response.usage.input_tokens, response.usage.output_tokens);
```

---

## Verification

- [ ] `/api/ai/chat` responds with Claude message
- [ ] Knowledge context injected into prompt
- [ ] AIAssistant widget sends real requests
- [ ] Messages display correctly
- [ ] Copy button works
- [ ] Loading state shows
- [ ] Error handling works

## ENV Vars

Ensure `ANTHROPIC_API_KEY` is set in Vercel.

## Cost Estimation

- Claude Sonnet: ~$3 per 1M input, ~$15 per 1M output
- With 100 requests/day @ ~500 tokens each:
  - ~50k tokens/day = ~$0.15-0.75/day
  - ~$5-25/month

## Output

- `src/app/api/ai/chat/route.ts`
- `src/components/layout/AIAssistant.tsx` (updated)
- `src/lib/ai-usage.ts` (optional)

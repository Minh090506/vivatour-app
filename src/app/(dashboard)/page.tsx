'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  DollarSign,
  AlertCircle,
  Mail,
  Calendar,
  ArrowRight,
  Clock,
  Phone,
  MailOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Mock data - will be replaced with API calls
const mockStats = {
  totalRevenue: 125000000,
  totalCost: 89500000,
  newRequests: 23,
  activeBookings: 8,
  revenueChange: 12,
  costChange: 5,
  requestChange: 3,
  bookingChange: -2,
};

const mockFollowUps = [
  {
    id: '1',
    customerName: 'John Smith',
    country: 'USA',
    overdueDays: 5,
    status: 'F2',
    contact: 'john@gmail.com',
    source: 'TripAdvisor',
  },
  {
    id: '2',
    customerName: 'Mary Jane',
    country: 'UK',
    overdueDays: 3,
    status: 'F2',
    contact: 'mary@outlook.com',
    source: 'Email',
  },
  {
    id: '3',
    customerName: 'Tanaka Hiro',
    country: 'Japan',
    overdueDays: 2,
    status: 'F3',
    contact: 'tanaka@yahoo.jp',
    source: 'Agent',
  },
];

const mockEmails = [
  {
    id: '1',
    from: 'john@gmail.com',
    subject: 'Question about visa requirements',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: false,
    customerName: 'John Smith',
  },
  {
    id: '2',
    from: 'mary@outlook.com',
    subject: 'Booking confirmation needed',
    date: new Date(Date.now() - 5 * 60 * 60 * 1000),
    isRead: true,
    customerName: 'Mary Jane',
  },
  {
    id: '3',
    from: 'peter@yahoo.com',
    subject: 'Re: Itinerary update',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isRead: true,
    customerName: 'Peter Parker',
  },
];

const mockActions = [
  { label: '5 khách quá hạn follow-up', type: 'warning', count: 5 },
  { label: '3 khoản cần thanh toán NCC', type: 'danger', count: 3 },
  { label: '2 email chưa reply (>24h)', type: 'info', count: 2 },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  return 'Vừa xong';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    );
  }, []);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, Minh!
          </h1>
          <p className="text-muted-foreground">
            Tổng quan hoạt động kinh doanh của bạn
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{currentDate}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Doanh thu tháng này
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mockStats.totalRevenue)}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {mockStats.revenueChange > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{mockStats.revenueChange}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{mockStats.revenueChange}%</span>
                </>
              )}
              <span className="text-muted-foreground">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chi phí tháng này
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mockStats.totalCost)}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-orange-500">+{mockStats.costChange}%</span>
              <span className="text-muted-foreground">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Request mới (7 ngày)
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.newRequests}</div>
            <div className="flex items-center gap-1 text-sm">
              {mockStats.requestChange > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{mockStats.requestChange}</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{mockStats.requestChange}</span>
                </>
              )}
              <span className="text-muted-foreground">so với tuần trước</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Booking đang hoạt động
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.activeBookings}</div>
            <div className="flex items-center gap-1 text-sm">
              {mockStats.bookingChange > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{mockStats.bookingChange}</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">{mockStats.bookingChange}</span>
                </>
              )}
              <span className="text-muted-foreground">so với tuần trước</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items & Recent Emails */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Cần hành động ngay
            </CardTitle>
            <CardDescription>
              Các việc cần xử lý ưu tiên cao
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockActions.map((action, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      action.type === 'danger'
                        ? 'destructive'
                        : action.type === 'warning'
                        ? 'default'
                        : 'secondary'
                    }
                    className="h-6 w-6 p-0 flex items-center justify-center rounded-full"
                  >
                    {action.count}
                  </Badge>
                  <span className="text-sm">{action.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
            <Separator />
            <Button variant="link" className="w-full" asChild>
              <Link href="/requests?filter=overdue">
                Xem tất cả <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Emails */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              Email gần đây
            </CardTitle>
            <CardDescription>
              Từ info@myvivatour.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockEmails.map((email) => (
              <div
                key={email.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              >
                <div
                  className={`p-2 rounded-full ${
                    email.isRead ? 'bg-gray-200' : 'bg-blue-100'
                  }`}
                >
                  {email.isRead ? (
                    <MailOpen className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Mail className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {email.customerName}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimeAgo(email.date)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {email.subject}
                  </p>
                </div>
                {!email.isRead && (
                  <Badge variant="default" className="text-xs">
                    Mới
                  </Badge>
                )}
              </div>
            ))}
            <Separator />
            <Button variant="link" className="w-full">
              Xem tất cả <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-500" />
            Khách cần follow-up
          </CardTitle>
          <CardDescription>
            Khách hàng quá hạn chăm sóc
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockFollowUps.map((customer) => (
              <Card key={customer.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{customer.customerName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {customer.country} • {customer.source}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      +{customer.overdueDays} ngày
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{customer.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {customer.contact}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Phone className="h-4 w-4 mr-1" />
                      Gọi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Separator className="my-4" />
          <Button variant="link" className="w-full" asChild>
            <Link href="/requests?filter=followup">
              Xem tất cả khách cần follow-up <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

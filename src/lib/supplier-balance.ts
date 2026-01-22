import { prisma } from './db';
import type { SupplierBalance, SupplierBalanceAlert, PaymentModel } from '@/types';

// Default low balance threshold (can be overridden per payment model)
export const DEFAULT_LOW_BALANCE_THRESHOLD = 5000000; // 5 million VND

// Payment model specific thresholds
export const LOW_BALANCE_THRESHOLDS: Record<PaymentModel, number> = {
  PREPAID: 5000000,     // 5M - needs top-up soon
  PAY_PER_USE: 0,       // No threshold - pay as you go
  CREDIT: -10000000,    // -10M - approaching credit limit
};

/**
 * Calculate balance for a single supplier
 * Balance = deposits + refunds + adjustments - fees - operator costs
 */
export async function calculateSupplierBalance(supplierId: string): Promise<SupplierBalance> {
  // Get transaction totals by type
  const transactionSums = await prisma.supplierTransaction.groupBy({
    by: ['type'],
    where: { supplierId },
    _sum: { amount: true },
  });

  // Get total operator costs linked to this supplier
  const costSum = await prisma.operator.aggregate({
    where: { supplierId },
    _sum: { totalCost: true },
  });

  // Extract amounts by type
  const deposits = Number(transactionSums.find(t => t.type === 'DEPOSIT')?._sum.amount ?? 0);
  const refunds = Number(transactionSums.find(t => t.type === 'REFUND')?._sum.amount ?? 0);
  const adjustments = Number(transactionSums.find(t => t.type === 'ADJUSTMENT')?._sum.amount ?? 0);
  const fees = Number(transactionSums.find(t => t.type === 'FEE')?._sum.amount ?? 0);
  const costs = Number(costSum._sum.totalCost ?? 0);

  // Calculate balance: deposits + refunds + adjustments - fees - costs
  const balance = deposits + refunds + adjustments - fees - costs;

  return {
    deposits,
    refunds,
    adjustments,
    fees,
    costs,
    balance,
  };
}

/**
 * Get balance summary for all suppliers with optional type filter
 */
export async function getSupplierBalanceSummary(typeFilter?: string) {
  // Get all active suppliers
  const whereClause: Record<string, unknown> = { isActive: true };
  if (typeFilter) {
    whereClause.type = typeFilter;
  }

  const suppliers = await prisma.supplier.findMany({
    where: whereClause,
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      paymentModel: true,
      isActive: true,
    },
    orderBy: { code: 'asc' },
  });

  // Calculate balance for each supplier
  const results = await Promise.all(
    suppliers.map(async (supplier) => {
      const balance = await calculateSupplierBalance(supplier.id);
      return {
        ...supplier,
        deposits: balance.deposits,
        costs: balance.costs,
        refunds: balance.refunds,
        balance: balance.balance,
      };
    })
  );

  // Calculate summary totals
  const summary = {
    supplierCount: results.length,
    totalDeposits: results.reduce((sum, s) => sum + s.deposits, 0),
    totalCosts: results.reduce((sum, s) => sum + s.costs, 0),
    totalRefunds: results.reduce((sum, s) => sum + s.refunds, 0),
    totalBalance: results.reduce((sum, s) => sum + s.balance, 0),
    positiveBalance: results.filter(s => s.balance > 0).length,
    negativeBalance: results.filter(s => s.balance < 0).length,
  };

  // Payment model distribution
  const paymentModelMap = new Map<string, { count: number; totalBalance: number }>();
  for (const s of results) {
    const model = s.paymentModel || 'PREPAID';
    const entry = paymentModelMap.get(model) || { count: 0, totalBalance: 0 };
    entry.count += 1;
    entry.totalBalance += s.balance;
    paymentModelMap.set(model, entry);
  }
  const byPaymentModel = Array.from(paymentModelMap.entries()).map(([model, data]) => ({
    model,
    count: data.count,
    totalBalance: data.totalBalance,
  }));

  return { data: results, summary, byPaymentModel };
}

/**
 * Get balance trend by month (last 6 months)
 */
export async function getBalanceTrend() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Get transactions grouped by month
  const transactions = await prisma.supplierTransaction.findMany({
    where: {
      createdAt: { gte: sixMonthsAgo },
    },
    select: {
      type: true,
      amount: true,
      createdAt: true,
    },
  });

  // Get operator costs grouped by month
  const operators = await prisma.operator.findMany({
    where: {
      serviceDate: { gte: sixMonthsAgo },
      supplierId: { not: null },
    },
    select: {
      totalCost: true,
      serviceDate: true,
    },
  });

  // Group by month
  const monthMap = new Map<string, { deposits: number; costs: number }>();

  // Initialize 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { deposits: 0, costs: 0 });
  }

  // Add transaction deposits
  for (const t of transactions) {
    if (t.type === 'DEPOSIT') {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key);
      if (entry) {
        entry.deposits += Number(t.amount);
      }
    }
  }

  // Add operator costs
  for (const op of operators) {
    const d = new Date(op.serviceDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(key);
    if (entry) {
      entry.costs += Number(op.totalCost);
    }
  }

  // Convert to array with running balance
  let runningBalance = 0;
  const trend = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => {
      runningBalance += data.deposits - data.costs;
      return {
        month,
        deposits: data.deposits,
        costs: data.costs,
        balance: runningBalance,
      };
    });

  return trend;
}

/**
 * Get suppliers with low balance alerts
 * Returns suppliers whose balance is below their payment model threshold
 */
export async function getLowBalanceAlerts(
  customThreshold?: number
): Promise<SupplierBalanceAlert[]> {
  // Get all active suppliers with their payment model
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      paymentModel: true,
      creditLimit: true,
    },
    orderBy: { code: 'asc' },
  });

  const alerts: SupplierBalanceAlert[] = [];

  for (const supplier of suppliers) {
    const balance = await calculateSupplierBalance(supplier.id);
    const paymentModel = supplier.paymentModel as PaymentModel;

    // Determine threshold: custom > credit limit (for CREDIT) > payment model default
    let threshold = customThreshold ?? LOW_BALANCE_THRESHOLDS[paymentModel];

    // For CREDIT model, use negative credit limit as threshold if set
    if (paymentModel === 'CREDIT' && supplier.creditLimit) {
      threshold = -Number(supplier.creditLimit);
    }

    // Skip PAY_PER_USE unless custom threshold is provided
    if (paymentModel === 'PAY_PER_USE' && customThreshold === undefined) {
      continue;
    }

    // Check if balance is below threshold
    if (balance.balance <= threshold) {
      // Determine severity
      let severity: 'warning' | 'critical' = 'warning';
      if (paymentModel === 'PREPAID' && balance.balance <= 0) {
        severity = 'critical';
      } else if (paymentModel === 'CREDIT' && supplier.creditLimit) {
        // Critical if over 80% of credit limit used
        const creditLimit = Number(supplier.creditLimit);
        if (Math.abs(balance.balance) >= creditLimit * 0.8) {
          severity = 'critical';
        }
      }

      alerts.push({
        supplierId: supplier.id,
        supplierCode: supplier.code,
        supplierName: supplier.name,
        supplierType: supplier.type,
        paymentModel,
        balance: balance.balance,
        threshold,
        severity,
        message: getAlertMessage(paymentModel, balance.balance, threshold, severity),
      });
    }
  }

  // Sort by severity (critical first) then by balance (lowest first)
  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return a.balance - b.balance;
  });
}

/**
 * Generate alert message based on payment model and balance
 */
function getAlertMessage(
  paymentModel: PaymentModel,
  balance: number,
  threshold: number,
  severity: 'warning' | 'critical'
): string {
  const formatAmount = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.abs(n));

  if (paymentModel === 'PREPAID') {
    if (severity === 'critical') {
      return balance < 0
        ? `So du am ${formatAmount(balance)} VND - can nap tien ngay`
        : `So du con lai ${formatAmount(balance)} VND - can nap tien`;
    }
    return `So du thap ${formatAmount(balance)} VND - nen nap them`;
  }

  if (paymentModel === 'CREDIT') {
    const used = Math.abs(balance);
    const limit = Math.abs(threshold);
    const percent = Math.round((used / limit) * 100);
    if (severity === 'critical') {
      return `Da su dung ${percent}% han muc (${formatAmount(used)}/${formatAmount(limit)} VND)`;
    }
    return `Dang su dung ${percent}% han muc tin dung`;
  }

  // PAY_PER_USE (only shown with custom threshold)
  return `So du ${balance < 0 ? 'am ' : ''}${formatAmount(balance)} VND`;
}

/**
 * Get transaction history for a supplier with filters
 */
export async function getSupplierTransactionHistory(
  supplierId: string,
  options: {
    fromDate?: Date;
    toDate?: Date;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { fromDate, toDate, type, limit = 50, offset = 0 } = options;

  const where: Record<string, unknown> = { supplierId };

  if (type) where.type = type;

  if (fromDate || toDate) {
    where.transactionDate = {};
    if (fromDate) (where.transactionDate as Record<string, Date>).gte = fromDate;
    if (toDate) (where.transactionDate as Record<string, Date>).lte = toDate;
  }

  const [transactions, total] = await Promise.all([
    prisma.supplierTransaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        transactionDate: true,
        description: true,
        proofLink: true,
        relatedBookingCode: true,
        createdAt: true,
      },
      orderBy: { transactionDate: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.supplierTransaction.count({ where }),
  ]);

  return { transactions, total, hasMore: offset + transactions.length < total };
}

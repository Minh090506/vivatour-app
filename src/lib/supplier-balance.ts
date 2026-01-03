import { prisma } from './db';
import type { SupplierBalance } from '@/types';

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

  return { data: results, summary };
}

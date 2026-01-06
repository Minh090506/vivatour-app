'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Inline config to avoid build-time dependency on Phase 1-A
const CURRENCIES = {
  VND: { label: 'VND', symbol: '₫', decimals: 0 },
  USD: { label: 'USD', symbol: '$', decimals: 2 },
  EUR: { label: 'EUR', symbol: '€', decimals: 2 },
  GBP: { label: 'GBP', symbol: '£', decimals: 2 },
  AUD: { label: 'AUD', symbol: 'A$', decimals: 2 },
  JPY: { label: 'JPY', symbol: '¥', decimals: 0 },
  SGD: { label: 'SGD', symbol: 'S$', decimals: 2 },
  THB: { label: 'THB', symbol: '฿', decimals: 2 },
} as const;

type CurrencyKey = keyof typeof CURRENCIES;
const CURRENCY_KEYS = Object.keys(CURRENCIES) as CurrencyKey[];

const DEFAULT_EXCHANGE_RATES: Record<CurrencyKey, number> = {
  VND: 1,
  USD: 25000,
  EUR: 27000,
  GBP: 32000,
  AUD: 16500,
  JPY: 165,
  SGD: 18500,
  THB: 700,
};

interface CurrencyInputProps {
  value: {
    currency: string;
    foreignAmount: number | null;
    exchangeRate: number | null;
    amountVND: number;
  };
  onChange: (value: {
    currency: string;
    foreignAmount: number | null;
    exchangeRate: number | null;
    amountVND: number;
  }) => void;
  disabled?: boolean;
}

export function CurrencyInput({ value, onChange, disabled }: CurrencyInputProps) {
  const currency = (value.currency || 'VND') as CurrencyKey;
  const isVND = currency === 'VND';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const handleCurrencyChange = (newCurrency: string) => {
    if (newCurrency === 'VND') {
      // Switching to VND, clear foreign fields
      onChange({
        currency: 'VND',
        foreignAmount: null,
        exchangeRate: null,
        amountVND: value.amountVND || 0,
      });
    } else {
      // Switching to foreign currency, set default rate
      const defaultRate = DEFAULT_EXCHANGE_RATES[newCurrency as CurrencyKey] || 25000;
      const foreignAmount = value.foreignAmount || 0;
      onChange({
        currency: newCurrency,
        foreignAmount,
        exchangeRate: defaultRate,
        amountVND: Math.round(foreignAmount * defaultRate),
      });
    }
  };

  const handleAmountChange = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;

    if (isVND) {
      onChange({
        ...value,
        amountVND: numAmount,
      });
    } else {
      const rate = value.exchangeRate || DEFAULT_EXCHANGE_RATES[currency];
      onChange({
        ...value,
        foreignAmount: numAmount,
        amountVND: Math.round(numAmount * rate),
      });
    }
  };

  const handleRateChange = (rate: string) => {
    const numRate = parseFloat(rate) || 0;
    const foreignAmount = value.foreignAmount || 0;
    onChange({
      ...value,
      exchangeRate: numRate,
      amountVND: Math.round(foreignAmount * numRate),
    });
  };

  const handleVNDDirectChange = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    onChange({
      ...value,
      amountVND: numAmount,
    });
  };

  return (
    <div className="space-y-4">
      {/* Currency Selector */}
      <div className="space-y-2">
        <Label>Loại tiền</Label>
        <Select value={currency} onValueChange={handleCurrencyChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {CURRENCIES[key].symbol} {CURRENCIES[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isVND ? (
        /* VND Direct Input */
        <div className="space-y-2">
          <Label htmlFor="amountVND">Số tiền (VND) *</Label>
          <Input
            id="amountVND"
            type="number"
            value={value.amountVND || ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="10000000"
            disabled={disabled}
          />
          {value.amountVND > 0 && (
            <p className="text-sm text-muted-foreground">
              {formatCurrency(value.amountVND)} ₫
            </p>
          )}
        </div>
      ) : (
        /* Foreign Currency Input */
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="foreignAmount">Số tiền ({currency}) *</Label>
            <Input
              id="foreignAmount"
              type="number"
              step={CURRENCIES[currency].decimals > 0 ? '0.01' : '1'}
              value={value.foreignAmount || ''}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="1000"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exchangeRate">Tỷ giá *</Label>
            <Input
              id="exchangeRate"
              type="number"
              value={value.exchangeRate || ''}
              onChange={(e) => handleRateChange(e.target.value)}
              placeholder={String(DEFAULT_EXCHANGE_RATES[currency])}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* VND Result (for foreign currency) */}
      {!isVND && (
        <div className="space-y-2">
          <Label htmlFor="amountVNDResult">Quy đổi VND</Label>
          <Input
            id="amountVNDResult"
            type="number"
            value={value.amountVND || ''}
            onChange={(e) => handleVNDDirectChange(e.target.value)}
            className="bg-gray-100 font-bold"
            disabled={disabled}
          />
          {value.amountVND > 0 && (
            <p className="text-sm font-medium text-primary">
              {formatCurrency(value.amountVND)} ₫
            </p>
          )}
        </div>
      )}
    </div>
  );
}

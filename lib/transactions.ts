import { createClient } from './supabase';

export type TransactionRow = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
};

const TYPE_TITLE: Record<string, string> = {
  listing_credit: 'Listing sold',
  swap_debit: 'Swap',
  swap_credit: 'Swap received',
  monthly_fee: 'Monthly fee',
  referral_bonus: 'Referral bonus',
  system_adjustment: 'Adjustment',
};

/** Fetch transactions for the current user (profile_id). Ordered by created_at desc. */
export async function fetchTransactions(profileId: string): Promise<TransactionRow[]> {
  if (!profileId) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, type, description, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data ?? []) as TransactionRow[];
  } catch {
    return [];
  }
}

/** Map DB row to display title and status for wallet UI */
export function transactionDisplay(row: TransactionRow): {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
  status: string;
} {
  const title = row.description?.trim() || TYPE_TITLE[row.type] || row.type;
  const d = new Date(row.created_at);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const isCredit = row.amount > 0;
  const status = row.type === 'monthly_fee' ? 'Automatic' : 'Completed';
  return {
    id: row.id,
    title,
    date,
    amount: Math.abs(row.amount),
    type: isCredit ? 'credit' : 'debit',
    status,
  };
}

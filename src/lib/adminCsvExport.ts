/**
 * Generic CSV export, used by the admin Users and Transactions tables.
 * Kept separate from the customer-facing TransactionsPage's inline CSV
 * export (V2.1, a completed module) rather than refactoring that file to
 * share this — avoids touching completed work for a cosmetic dedupe.
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

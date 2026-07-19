import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminPagination({
  page, totalPages, total, pageSize, onChange,
}: {
  page: number; totalPages: number; total: number; pageSize: number; onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-gray-50">
      <p className="text-xs text-gray-400 font-medium">
        Showing <span className="font-bold text-gray-600">{start}-{end}</span> of <span className="font-bold text-gray-600">{total}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-admin-blue hover:text-admin-blue disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-xs font-bold text-gray-600 px-2 min-w-[70px] text-center">Page {page} / {totalPages}</span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-admin-blue hover:text-admin-blue disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

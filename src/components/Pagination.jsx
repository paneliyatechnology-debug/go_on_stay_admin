import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  color = 'teal',
  theme = 'default', // 'default' | 'luxury'
  className = '',
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  if (totalItems <= itemsPerPage) {
    return null;
  }

  const isLuxury = theme === 'luxury' || color === 'gold';
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const activeColorClasses = {
    gold: 'bg-gradient-to-r from-[#BF8E36] via-[#D8A74B] to-[#BF8E36] text-white font-black shadow-sm border-none',
    teal: 'bg-teal-600 text-white shadow-xs',
    rose: 'bg-rose-600 text-white shadow-xs',
    emerald: 'bg-emerald-600 text-white shadow-xs',
    amber: 'bg-amber-500 text-white shadow-xs',
    indigo: 'bg-indigo-600 text-white shadow-xs',
  }[color] || (isLuxury ? 'bg-gradient-to-r from-[#BF8E36] via-[#D8A74B] to-[#BF8E36] text-white font-black' : 'bg-teal-600 text-white');

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border-t border-slate-200 text-slate-700 ${className}`}
    >
      <div className="text-xs font-semibold text-slate-600 tracking-wide">
        Showing{' '}
        <span className="text-slate-900 font-black">
          {startItem}
        </span>{' '}
        to{' '}
        <span className="text-slate-900 font-black">
          {endItem}
        </span>{' '}
        of{' '}
        <span className="text-slate-900 font-black">
          {totalItems}
        </span>{' '}
        results
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* Jump to first page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>

        {/* Numbered buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 text-xs font-bold">
                  ...
                </span>
              );
            }
            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? activeColorClasses
                    : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Jump to last page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

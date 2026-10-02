import type { ReactNode } from 'react';
import type { PaginationState } from '@/lib/hooks';
import { rowsOnPage } from '@/lib/hooks/pagination';
import { Card } from './Card';
import { DataTable, type DataTableColumn } from './DataTable';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';

interface PagedTableProps<T> {
  caption: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading: boolean;
  loadingLabel: string;
  pagination: Pick<PaginationState, 'page' | 'pageSize' | 'setPage' | 'setPageSize' | 'anchorRef'>;
  /** Absent until the first page answers, which is also what hides the pager. */
  meta?: { total: number; pageCount: number };
  /** Set when the page could not be loaded; it replaces the table entirely. */
  failure?: { title: string; description: string };
  empty: ReactNode;
}

/**
 * A server-paginated list: the table, the pager under it, and what stands in
 * for both when the request fails. Every list screen had the same arrangement
 * spelled out by hand.
 */
export function PagedTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  isLoading,
  loadingLabel,
  pagination,
  meta,
  failure,
  empty,
}: Readonly<PagedTableProps<T>>) {
  return (
    <>
      {failure ? (
        <EmptyState title={failure.title} description={failure.description} />
      ) : (
        <Card ref={pagination.anchorRef} className="scroll-mt-20 p-0 sm:p-0">
          <DataTable
            caption={caption}
            columns={columns}
            rows={rows}
            rowKey={rowKey}
            isLoading={isLoading}
            skeletonRows={rowsOnPage(pagination.page, pagination.pageSize, meta?.total)}
            loadingLabel={loadingLabel}
            className="px-2 py-1 sm:px-4 sm:py-2"
            empty={empty}
          />
        </Card>
      )}

      {meta && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={meta.total}
          pageCount={meta.pageCount}
          isLoading={isLoading}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}
    </>
  );
}

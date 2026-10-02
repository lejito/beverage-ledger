import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface FilteredEmptyStateProps {
  isFiltered: boolean;
  title: string;
  filteredTitle: string;
  clearLabel: string;
  onClear: () => void;
}

/**
 * An empty list says different things with and without filters: with them,
 * the way out is clearing them, so that is the action it offers.
 */
export function FilteredEmptyState({
  isFiltered,
  title,
  filteredTitle,
  clearLabel,
  onClear,
}: Readonly<FilteredEmptyStateProps>) {
  return (
    <EmptyState
      title={isFiltered ? filteredTitle : title}
      action={
        isFiltered ? (
          <Button variant="secondary" size="sm" onClick={onClear}>
            {clearLabel}
          </Button>
        ) : undefined
      }
    />
  );
}

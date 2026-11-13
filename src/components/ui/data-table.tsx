"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SortValue = string | number | null | undefined;
type SortDirection = "asc" | "desc";

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable. Empty values always sort last. */
  sortValue?: (row: T) => SortValue;
  align?: "left" | "right";
  /** Extra classes for the column's cells, usually a width. */
  className?: string;
}

export interface TableFilter<T> {
  id: string;
  /** Shown as the "no filter" choice, e.g. "All statuses". */
  label: string;
  options: { value: string; label: string }[];
  matches: (row: T, value: string) => boolean;
}

/** The parent owns paging: `rows` is one page and `total` is how many rows match in all. */
export interface ServerPaging {
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  /** True while the next page is loading and the previous one is still shown. */
  loading?: boolean;
  /** Any server-side filter is set, so an empty page means "no match", not "no data". */
  filtered?: boolean;
  onClearFilters?: () => void;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Makes the whole row a link. Links and buttons inside a cell keep working. */
  rowHref?: (row: T) => string;
  /** Text the search box matches against. Omit to hide the search box. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: TableFilter<T>[];
  initialSort?: { id: string; direction: SortDirection };
  pageSize?: number;
  /** Shown when there are no rows at all. */
  empty: string;
  /** Extra controls in the toolbar, e.g. filters the server applies. */
  toolbar?: ReactNode;
  server?: ServerPaging;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compare(a: SortValue, b: SortValue) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

function isBlank(value: SortValue) {
  return value === null || value === undefined || value === "";
}

export const selectClass =
  "h-8 rounded-md border border-border bg-card px-2 text-[13px] text-foreground outline-none focus:border-ring";

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  rowHref,
  searchText,
  searchPlaceholder,
  filters = [],
  initialSort,
  pageSize = 25,
  empty,
  toolbar,
  server,
}: DataTableProps<T>) {
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(initialSort ?? null);
  const [clientPage, setClientPage] = useState(0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let result = rows.filter((row) => {
      if (needle && searchText && !searchText(row).toLowerCase().includes(needle)) return false;
      return filters.every((filter) => {
        const value = filterValues[filter.id];
        return !value || filter.matches(row, value);
      });
    });
    const column = sort ? columns.find((item) => item.id === sort.id) : undefined;
    if (sort && column?.sortValue) {
      const read = column.sortValue;
      const sign = sort.direction === "asc" ? 1 : -1;
      result = [...result].sort((left, right) => {
        const a = read(left);
        const b = read(right);
        if (isBlank(a) || isBlank(b)) return Number(isBlank(a)) - Number(isBlank(b));
        return sign * compare(a, b);
      });
    }
    return result;
  }, [rows, columns, filters, filterValues, query, searchText, sort]);

  const total = server ? server.total : visible.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(server ? server.page : clientPage, pageCount - 1);
  const setPage = server ? server.onPageChange : setClientPage;
  const pageRows = server ? visible : visible.slice(page * pageSize, (page + 1) * pageSize);

  const clientFiltered = Boolean(query.trim()) || Object.values(filterValues).some(Boolean);
  const filtered = clientFiltered || Boolean(server?.filtered);
  const hasToolbar = Boolean(searchText) || filters.length > 0 || Boolean(toolbar);

  function clearFilters() {
    setQuery("");
    setFilterValues({});
    setClientPage(0);
    server?.onClearFilters?.();
  }

  function toggleSort(id: string) {
    setSort((current) =>
      current?.id === id
        ? { id, direction: current.direction === "asc" ? "desc" : "asc" }
        : { id, direction: "asc" }
    );
    setClientPage(0);
  }

  function openRow(event: MouseEvent<HTMLTableRowElement>, row: T) {
    if (!rowHref) return;
    if ((event.target as HTMLElement).closest("a, button, input, select, label")) return;
    if (window.getSelection()?.toString()) return;
    const href = rowHref(row);
    if (event.metaKey || event.ctrlKey) window.open(href, "_blank", "noopener");
    else router.push(href);
  }

  if (rows.length === 0 && !filtered && !server && !toolbar) {
    return <p className="text-[13px] text-muted-foreground">{empty}</p>;
  }

  return (
    <div>
      {hasToolbar ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {searchText ? (
            <div className="relative w-[260px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                placeholder={searchPlaceholder ?? t("table.search")}
                aria-label={searchPlaceholder ?? t("table.search")}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setClientPage(0);
                }}
                className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-7 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  aria-label={t("table.clearSearch")}
                  onClick={() => {
                    setQuery("");
                    setClientPage(0);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
          {filters.map((filter) => (
            <select
              key={filter.id}
              aria-label={filter.label}
              value={filterValues[filter.id] ?? ""}
              onChange={(event) => {
                setFilterValues((current) => ({ ...current, [filter.id]: event.target.value }));
                setClientPage(0);
              }}
              className={selectClass}
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
          {toolbar}
          {filtered ? (
            <button
              type="button"
              onClick={clearFilters}
              className="h-8 px-1 text-[12px] text-muted-foreground hover:text-foreground"
            >
              {t("table.clearFilters")}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((column) => {
                const sorted = sort?.id === column.id ? sort.direction : null;
                const SortIcon = sorted === "asc" ? ChevronUp : sorted === "desc" ? ChevronDown : ChevronsUpDown;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      !column.sortValue
                        ? undefined
                        : sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none"
                    }
                    className={cn(
                      "h-9 whitespace-nowrap px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
                      column.align === "right" && "text-right",
                      column.className
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className={cn(
                          "inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-foreground",
                          column.align === "right" && "flex-row-reverse",
                          sorted && "text-foreground"
                        )}
                      >
                        {column.header}
                        <SortIcon className={cn("size-3", !sorted && "opacity-50")} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-border", server?.loading && "opacity-60")}>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                  {filtered ? t("table.noMatch") : empty}
                  {filtered ? (
                    <div className="mt-3">
                      <Button variant="outline" onClick={clearFilters}>
                        {t("table.clearFilters")}
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={rowHref ? (event) => openRow(event, row) : undefined}
                  className={cn(rowHref && "cursor-pointer hover:bg-muted/40")}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "px-4 py-3 align-middle",
                        column.align === "right" && "text-right",
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-muted-foreground">
        <span>
          {total === 0
            ? t("table.none")
            : t("table.range", {
                from: page * pageSize + 1,
                to: Math.min(total, page * pageSize + pageRows.length),
                total,
              })}
        </span>
        {pageCount > 1 ? (
          <div className="flex items-center gap-2">
            <span>{t("table.page", { page: page + 1, pages: pageCount })}</span>
            <Button
              variant="outline"
              className="px-1.5"
              aria-label={t("table.previous")}
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="px-1.5"
              aria-label={t("table.next")}
              disabled={page >= pageCount - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

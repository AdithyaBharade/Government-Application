/**
 * Office register on AG Grid – for desk work on a laptop: sort, filter and page through every file.
 * Loaded lazily, so phones (which get the card list) never download it.
 */
import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AgGridReact } from 'ag-grid-react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ClientSideRowModelModule,
  CsvExportModule,
  ValidationModule,
  DateFilterModule,
  LocaleModule,
  ModuleRegistry,
  NumberFilterModule,
  PaginationModule,
  RowStyleModule,
  TextFilterModule,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowClassParams,
} from 'ag-grid-community';
import type { ApplicationSummary } from '../api/types';
import { displayName, formatDate, rupees } from '../lib/format';
import { FlagChips, ReturnedBadge, SlaBadge, StageBadge } from './badges';

// Register only what we use – keeps the bundle small
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CsvExportModule,
  // dev only: logs a clear error if a feature is used without its module
  ...(import.meta.env.DEV ? [ValidationModule] : []),
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  PaginationModule,
  RowStyleModule,
  LocaleModule,
]);

// AG Grid's Quartz theme, matched to the shadcn tokens
const theme = themeQuartz.withParams({
  fontFamily: 'inherit',
  fontSize: 14,
  accentColor: '#1d7a8c',
  foregroundColor: '#1c2526',
  backgroundColor: '#ffffff',
  borderColor: '#dfe6e7',
  headerBackgroundColor: '#f5f7f6',
  headerTextColor: '#5b6b6e',
  headerFontWeight: 600,
  rowHoverColor: '#eef7f8',
  wrapperBorderRadius: 12,
  rowHeight: 52,
  headerHeight: 44,
  spacing: 7,
});

type Row = ApplicationSummary;

export default function RegisterGrid({ rows }: { rows: Row[] }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const grid = useRef<AgGridReact<Row>>(null);

  const localeText = useMemo(
    () => ({
      noRowsToShow: t('grid.noRows'),
      page: t('grid.page'),
      of: '/',
      to: '–',
      pageSizeSelectorLabel: t('grid.pageSize'),
      filterOoo: t('grid.filterOoo'),
      contains: t('grid.contains'),
      notContains: t('grid.notContains'),
      equals: t('grid.equals'),
      notEqual: t('grid.notEqual'),
      startsWith: t('grid.startsWith'),
      endsWith: t('grid.endsWith'),
      blank: t('grid.blank'),
      notBlank: t('grid.notBlank'),
      lessThan: t('grid.lessThan'),
      greaterThan: t('grid.greaterThan'),
      inRange: t('grid.inRange'),
      andCondition: t('grid.andCondition'),
      orCondition: t('grid.orCondition'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );

  const columns = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: t('grid.appNo'), field: 'appNo', width: 150, pinned: 'left', filter: 'agTextColumnFilter' },
      {
        headerName: t('grid.applicant'),
        colId: 'applicant',
        valueGetter: (p) => (p.data ? `${displayName(p.data)} ${p.data.applicantName}` : ''),
        cellRenderer: (p: ICellRendererParams<Row>) =>
          p.data && (
            <div className="flex h-full flex-col justify-center leading-tight">
              <span className="font-semibold">{displayName(p.data)}</span>
              {displayName(p.data) !== p.data.applicantName && <span className="text-xs text-muted-foreground">{p.data.applicantName}</span>}
            </div>
          ),
        flex: 1.4,
        minWidth: 180,
        filter: 'agTextColumnFilter',
      },
      { headerName: t('fields.village'), field: 'village', flex: 1, minWidth: 120, filter: 'agTextColumnFilter' },
      { headerName: t('fields.purpose'), field: 'purpose', flex: 1.3, minWidth: 160, filter: 'agTextColumnFilter' },
      {
        headerName: t('fields.declaredIncome'),
        field: 'declaredIncome',
        width: 150,
        type: 'rightAligned',
        filter: 'agNumberColumnFilter',
        valueFormatter: (p) => rupees(p.value),
        cellClass: 'tabular-nums',
      },
      {
        headerName: t('grid.stage'),
        colId: 'stage',
        // filter/sort on the label the officer reads, in their language
        valueGetter: (p) => (p.data ? t(`stages.${p.data.stage}`) : ''),
        cellRenderer: (p: ICellRendererParams<Row>) => p.data && <StageBadge stage={p.data.stage} />,
        width: 190,
        filter: 'agTextColumnFilter',
      },
      {
        headerName: t('grid.sla'),
        colId: 'sla',
        // sort by urgency: open files by days left, closed files last
        valueGetter: (p) => (p.data ? (p.data.priority.sla === 'CLOSED' ? 10_000 : p.data.priority.daysLeft) : null),
        cellRenderer: (p: ICellRendererParams<Row>) =>
          p.data && (
            <div className="flex h-full items-center gap-1">
              {p.data.priority.sla === 'CLOSED' ? <span className="text-muted-foreground">{formatDate(p.data.decidedAt)}</span> : <SlaBadge priority={p.data.priority} />}
              {p.data.returnCount > 0 && p.data.priority.sla !== 'CLOSED' && <ReturnedBadge />}
            </div>
          ),
        width: 190,
        filter: 'agNumberColumnFilter',
        sort: 'asc',
      },
      {
        headerName: t('grid.received'),
        field: 'receivedAt',
        width: 140,
        filter: 'agDateColumnFilter',
        valueGetter: (p) => (p.data ? new Date(p.data.receivedAt) : null),
        valueFormatter: (p) => formatDate(p.value),
        filterParams: {
          comparator: (filterDate: Date, cell: Date) => {
            const d = new Date(cell.getFullYear(), cell.getMonth(), cell.getDate());
            return d < filterDate ? -1 : d > filterDate ? 1 : 0;
          },
        },
      },
      {
        headerName: t('grid.flags'),
        colId: 'flags',
        valueGetter: (p) => (p.data ? p.data.flags.map((f) => t(`ai.flags.${f}`)).join(', ') : ''),
        cellRenderer: (p: ICellRendererParams<Row>) =>
          p.data && (
            <div className="flex h-full items-center gap-1 overflow-hidden">
              <FlagChips flags={p.data.flags} />
            </div>
          ),
        flex: 1,
        minWidth: 160,
        filter: 'agTextColumnFilter',
        sortable: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language],
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            grid.current?.api.exportDataAsCsv({
              fileName: `kadata-register-${new Date().toISOString().slice(0, 10)}.csv`,
              processCellCallback: (p) => (p.value instanceof Date ? p.value.toISOString().slice(0, 10) : p.value),
            })
          }
        >
          <Download aria-hidden /> CSV
        </Button>
      </div>
      <div style={{ height: 'min(70vh, 720px)' }}>
      <AgGridReact<Row>
        ref={grid}
        key={i18n.language /* remount so headers + locale text switch language */}
        theme={theme}
        rowData={rows}
        columnDefs={columns}
        defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: false, floatingFilter: false }}
        localeText={localeText}
        getRowId={(p) => p.data.id}
        pagination
        paginationPageSize={20}
        paginationPageSizeSelector={[20, 50, 100]}
        rowClass="cursor-pointer"
        getRowStyle={(p: RowClassParams<Row>) => (p.data?.priority.sla === 'OVERDUE' ? { boxShadow: 'inset 4px 0 0 #dc2626' } : undefined)}
        onRowClicked={(e) => e.data && navigate(`/applications/${e.data.id}`)}
        suppressCellFocus
        animateRows={false}
      />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Info, Sparkles } from 'lucide-react';
import { useInsights } from '../api/hooks';
import { errorMessage } from '../api/client';
import type { AiKind, Insights, Stage } from '../api/types';
import { Card, ErrorState, PageLoader } from '../components/ui';

// Categorical slots 1 & 2 – validated for colour-blind separation (ΔE 24.7) and 3:1 contrast on white
const SERIES = { received: '#2a78d6', decided: '#eb6834' };

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-3xl leading-none font-bold tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

const pct = (n: number | null) => (n === null ? '—' : `${n}%`);

/** Average days each desk holds a file – one series, so no legend; values are direct-labelled. */
function DeskDays({ data }: { data: Insights['avgDaysAtStage'] }) {
  const { t } = useTranslation();
  const rows = (['VA_VERIFICATION', 'RI_VERIFICATION', 'DT_DECISION'] as Stage[]).map((s) => ({ stage: s, days: data[s] ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => r.days));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.stage}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{t(`stages.${r.stage}`)}</span>
            <span className="font-semibold tabular-nums">{r.days} {t('common.days')}</span>
          </div>
          <div className="h-3 rounded bg-canvas">
            <div className="h-3 rounded" style={{ width: `${(r.days / max) * 100}%`, background: SERIES.received }} title={`${r.days}`} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Grouped bars: received vs decided per week, with a tap/hover tooltip and a table view. */
function WeeklyChart({ weeks }: { weeks: Insights['weeks'] }) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<number | null>(null);
  const W = 600, H = 220, L = 28, R = 8, T = 12, B = 28;
  const max = Math.max(2, ...weeks.flatMap((w) => [w.received, w.decided]));
  const niceMax = Math.ceil(max / 2) * 2;
  const y = (v: number) => T + (H - T - B) * (1 - v / niceMax);
  const gw = (W - L - R) / weeks.length;
  const bw = Math.min(24, (gw - 18) / 2);
  const label = (iso: string) => new Intl.DateTimeFormat(`${i18n.language}-IN`, { day: 'numeric', month: 'short' }).format(new Date(iso));

  // Bar with 4px rounded data-end, square at the baseline
  const bar = (x: number, v: number) => {
    const top = y(v), base = y(0), r = Math.min(4, base - top);
    if (v === 0) return '';
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z`;
  };

  return (
    <div>
      <div className="mb-2 flex gap-4 text-sm">
        {(['received', 'decided'] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: SERIES[k] }} aria-hidden />
            {t(`insights.${k}`)}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('insights.weekly')} onMouseLeave={() => setActive(null)}>
          {[0, niceMax / 2, niceMax].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e7ecec" strokeWidth={1} />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#5b6b6e">{v}</text>
            </g>
          ))}
          {weeks.map((w, i) => {
            const x0 = L + i * gw + (gw - (bw * 2 + 2)) / 2;
            return (
              <g key={w.weekEnding}>
                <path d={bar(x0, w.received)} fill={SERIES.received} opacity={active === null || active === i ? 1 : 0.4} />
                <path d={bar(x0 + bw + 2, w.decided)} fill={SERIES.decided} opacity={active === null || active === i ? 1 : 0.4} />
                <text x={L + i * gw + gw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#5b6b6e">{label(w.weekEnding)}</text>
                {/* Hit target: the whole column, bigger than the bars */}
                <rect
                  x={L + i * gw}
                  y={T}
                  width={gw}
                  height={H - T - B}
                  fill="transparent"
                  tabIndex={0}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className="cursor-pointer outline-none"
                />
              </g>
            );
          })}
        </svg>
        {active !== null && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: `${((L + active * gw + gw / 2) / W) * 100}%`, transform: 'translateX(-50%)' }}
          >
            <div className="mb-1 font-semibold">{label(weeks[active].weekEnding)}</div>
            {(['received', 'decided'] as const).map((k) => (
              <div key={k} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="size-2 rounded-sm" style={{ background: SERIES[k] }} aria-hidden />
                {t(`insights.${k}`)}: <b className="tabular-nums">{weeks[active][k]}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">Table</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1">Week</th>
              <th className="py-1 text-right">{t('insights.received')}</th>
              <th className="py-1 text-right">{t('insights.decided')}</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.weekEnding} className="border-t border-line">
                <td className="py-1">{label(w.weekEnding)}</td>
                <td className="py-1 text-right tabular-nums">{w.received}</td>
                <td className="py-1 text-right tabular-nums">{w.decided}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export function InsightsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useInsights();
  if (isLoading) return <PageLoader />;
  if (isError || !data) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const kinds: AiKind[] = ['DOCUMENT_CHECK', 'FIELD_CHECKLIST', 'REPORT_DRAFT', 'CASE_BRIEF'];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <BarChart3 size={22} className="text-brand-600" aria-hidden /> {t('insights.title')}
        </h1>
        <p className="text-sm text-muted">{t('insights.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t('insights.pending')} value={String(data.pending.total)} sub={`${t('insights.overdue')}: ${data.pending.overdue}`} />
        <Tile label={t('insights.withinSla')} value={pct(data.decided.withinSlaPct)} sub={`${data.decided.approved} ✓ · ${data.decided.rejected} ✗`} />
        <Tile label={t('insights.avgDays')} value={String(data.decided.avgDaysToDecision)} />
        <Tile label={t('insights.returnRate')} value={pct(data.decided.returnRatePct)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('insights.weekly')}>
          <WeeklyChart weeks={data.weeks} />
        </Card>
        <Card title={t('insights.perStage')}>
          <DeskDays data={data.avgDaysAtStage} />
        </Card>
      </div>

      <Card title={t('insights.aiTable')} icon={<Sparkles size={16} className="text-ai-600" aria-hidden />}>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted">{t('insights.aiUseful')}</div>
            <div className="text-2xl font-bold tabular-nums">{pct(data.ai.usefulPct)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">{t('insights.aiAgreement')}</div>
            <div className="text-2xl font-bold tabular-nums">{pct(data.ai.decisionAgreementPct)}</div>
          </div>
        </div>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-medium" />
                <th className="py-2 text-right font-medium">{t('insights.runs')}</th>
                <th className="py-2 text-right font-medium">{t('insights.accepted')}</th>
                <th className="py-2 text-right font-medium">{t('insights.edited')}</th>
                <th className="py-2 text-right font-medium">{t('insights.dismissed')}</th>
                <th className="py-2 text-right font-medium">{t('insights.latency')}</th>
              </tr>
            </thead>
            <tbody>
              {kinds.map((k) => {
                const row = data.ai.byKind[k];
                return (
                  <tr key={k} className="border-t border-line">
                    <td className="py-2 font-medium">{t(`ai.kinds.${k}`)}</td>
                    <td className="py-2 text-right tabular-nums">{row?.runs ?? 0}</td>
                    <td className="py-2 text-right tabular-nums">{row?.accepted ?? 0}</td>
                    <td className="py-2 text-right tabular-nums">{row?.edited ?? 0}</td>
                    <td className="py-2 text-right tabular-nums">{row?.dismissed ?? 0}</td>
                    <td className="py-2 text-right tabular-nums">{row?.avgLatencyMs ? `${(row.avgLatencyMs / 1000).toFixed(1)}s` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="card flex gap-3 bg-brand-50 p-4">
        <Info className="mt-0.5 shrink-0 text-brand-700" size={18} aria-hidden />
        <div>
          <h2 className="font-semibold text-brand-700">{t('insights.how')}</h2>
          <p className="mt-1 text-sm">{t('insights.howBody')}</p>
        </div>
      </section>
    </div>
  );
}

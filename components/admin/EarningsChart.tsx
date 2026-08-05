import { formatPrice } from '@/lib/format';
import type { DailyEarning } from '@/lib/sample-earnings';
import styles from './EarningsChart.module.css';

const WIDTH = 480;
const HEIGHT = 200;
const PADDING = { top: 30, right: 12, bottom: 30, left: 12 };

const FULL_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/**
 * Inline SVG bar chart — no charting library, per the frozen dependency list.
 * The SVG itself is decorative (aria-hidden): every value it draws is
 * repeated in a visually-hidden table right below it, so a screen reader
 * gets the same 7 numbers a sighted user reads off the bars.
 */
export function EarningsChart({ daily }: { daily: DailyEarning[] }) {
  const max = Math.max(...daily.map((d) => d.amountCents), 1);
  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const usableWidth = WIDTH - PADDING.left - PADDING.right;
  const columnWidth = usableWidth / daily.length;
  const barWidth = columnWidth * 0.5;

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <line
          x1={PADDING.left}
          y1={HEIGHT - PADDING.bottom}
          x2={WIDTH - PADDING.right}
          y2={HEIGHT - PADDING.bottom}
          className={styles.baseline}
        />
        {daily.map((d, i) => {
          const barHeight = Math.max(3, (d.amountCents / max) * chartHeight);
          const x = PADDING.left + i * columnWidth + (columnWidth - barWidth) / 2;
          const y = HEIGHT - PADDING.bottom - barHeight;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={3} className={styles.bar} />
              <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className={styles.valueLabel}>
                {formatPrice(d.amountCents)}
              </text>
              <text
                x={x + barWidth / 2}
                y={HEIGHT - PADDING.bottom + 18}
                textAnchor="middle"
                className={styles.dayLabel}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      <table className="sr-only">
        <caption>Sample daily earnings, last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Earnings</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.date}>
              <th scope="row">{FULL_DATE_FORMAT.format(new Date(`${d.date}T12:00:00`))}</th>
              <td>{formatPrice(d.amountCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

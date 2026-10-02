import { describe, expect, it } from 'vitest';
import { granularityFor, REPORT_PERIODS, type ReportPeriod } from '@/features/reports/range';

describe('granularityFor', () => {
  it.each<[ReportPeriod, 'day' | 'week' | 'month']>([
    ['week', 'day'],
    ['month', 'day'],
    ['year', 'month'],
  ])('Camino - el periodo %s se agrupa por %s', (periodo, agrupacion) => {
    expect(granularityFor(periodo)).toBe(agrupacion);
  });

  it('Camino 4 - los periodos ofrecidos son los tres que tienen granularidad', () => {
    expect(REPORT_PERIODS).toEqual(['week', 'month', 'year']);
  });
});

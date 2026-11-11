import type { DocType } from '@prisma/client';

export interface IncomeSources {
  agriculture?: number;
  salary?: number;
  business?: number;
  other?: number;
}

/** Documents a Nadakacheri asks for with an income certificate application. */
export function requiredDocuments(app: { incomeSources: unknown; landAcres: number | null }): DocType[] {
  const src = (app.incomeSources ?? {}) as IncomeSources;
  const docs: DocType[] = ['AADHAAR', 'RATION_CARD', 'SELF_DECLARATION'];
  if ((src.salary ?? 0) > 0) docs.push('SALARY_CERTIFICATE');
  if ((src.agriculture ?? 0) > 0 || (app.landAcres ?? 0) > 0) docs.push('RTC');
  return docs;
}

export function missingDocuments(
  app: { incomeSources: unknown; landAcres: number | null },
  uploaded: { type: DocType }[],
): DocType[] {
  const have = new Set(uploaded.map((d) => d.type));
  return requiredDocuments(app).filter((t) => !have.has(t));
}

export function sumIncome(src: IncomeSources): number {
  return (src.agriculture ?? 0) + (src.salary ?? 0) + (src.business ?? 0) + (src.other ?? 0);
}

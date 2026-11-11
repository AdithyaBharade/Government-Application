import i18n from '../i18n';

const locale = () => `${i18n.language}-IN`;

/** ₹ amount in Indian grouping (1,20,000). */
export const rupees = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;

export const formatDate = (iso: string | Date | null | undefined) =>
  iso ? new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';

export const formatDateTime = (iso: string | Date) =>
  new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/** Applicant name in the script that suits the current language. */
export const displayName = (a: { applicantName: string; applicantNameLocal: string | null }) =>
  i18n.language === 'kn' && a.applicantNameLocal ? a.applicantNameLocal : a.applicantName;

export const personName = (p: { name: string; nameLocal?: string } | null | undefined) =>
  !p ? '' : i18n.language === 'kn' && p.nameLocal ? p.nameLocal : p.name;

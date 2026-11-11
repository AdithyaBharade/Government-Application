import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  ActionPayload,
  AiRun,
  ApplicationDetail,
  ApplicationSummary,
  DashboardSummary,
  DocType,
  Insights,
  Stage,
} from './types';

export const keys = {
  summary: ['summary'] as const,
  list: (scope: string, stage?: string, q?: string) => ['applications', scope, stage ?? '', q ?? ''] as const,
  detail: (id: string) => ['application', id] as const,
  insights: ['insights'] as const,
};

export const useSummary = () =>
  useQuery({ queryKey: keys.summary, queryFn: async () => (await api.get<DashboardSummary>('/applications/summary')).data });

export const useApplications = (scope: 'queue' | 'all', stage?: Stage, q?: string) =>
  useQuery({
    queryKey: keys.list(scope, stage, q),
    queryFn: async () =>
      (await api.get<{ items: ApplicationSummary[] }>('/applications', { params: { scope, stage, q: q || undefined } })).data.items,
  });

export const useApplication = (id: string) =>
  useQuery({ queryKey: keys.detail(id), queryFn: async () => (await api.get<ApplicationDetail>(`/applications/${id}`)).data });

export const useInsights = () =>
  useQuery({ queryKey: keys.insights, queryFn: async () => (await api.get<Insights>('/insights')).data });

function useInvalidateApp(id: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.detail(id) });
    qc.invalidateQueries({ queryKey: ['applications'] });
    qc.invalidateQueries({ queryKey: keys.summary });
    qc.invalidateQueries({ queryKey: keys.insights });
  };
}

export function useAction(id: string) {
  const invalidate = useInvalidateApp(id);
  return useMutation({
    mutationFn: async (payload: ActionPayload) => (await api.post<{ stage: Stage }>(`/applications/${id}/actions`, payload)).data,
    onSuccess: invalidate,
  });
}

export function useUpload(id: string) {
  const invalidate = useInvalidateApp(id);
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: DocType }) => {
      const form = new FormData();
      form.append('type', type);
      form.append('file', file);
      return (await api.post(`/applications/${id}/documents`, form)).data;
    },
    onSuccess: invalidate,
  });
}

export type AiEndpoint = 'document-check' | 'field-checklist' | 'report-draft' | 'case-brief';

export function useAi<T>(id: string, endpoint: AiEndpoint) {
  const invalidate = useInvalidateApp(id);
  return useMutation({
    mutationFn: async (body: { lang: string; notes?: string }) =>
      (await api.post<AiRun<T>>(`/applications/${id}/ai/${endpoint}`, body)).data,
    onSuccess: invalidate,
  });
}

export const sendAiFeedback = (runId: string, feedback: 'ACCEPTED' | 'EDITED' | 'DISMISSED') =>
  api.post(`/ai-runs/${runId}/feedback`, { feedback }).catch(() => undefined);

/** Documents need the auth header, so fetch as a blob and open an object URL. */
export async function openDocument(docId: string) {
  const win = window.open('', '_blank');
  const res = await api.get(`/documents/${docId}/file`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  if (win) win.location.href = url;
  else window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

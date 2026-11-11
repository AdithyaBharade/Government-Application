import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAction } from '../../api/hooks';
import { errorMessage } from '../../api/client';
import type { ActionPayload } from '../../api/types';

/** Submit a workflow action, confirm with a toast, then go back to the queue. */
export function useStageAction(appId: string) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mutation = useAction(appId);

  async function submit(payload: ActionPayload) {
    const res = await mutation.mutateAsync(payload);
    toast.success(t('action.done', { stage: t(`stages.${res.stage}`) }));
    navigate('/');
  }

  return {
    submit,
    busy: mutation.isPending,
    error: mutation.error ? errorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}

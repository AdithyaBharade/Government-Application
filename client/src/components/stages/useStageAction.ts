import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAction } from '../../api/hooks';
import { errorMessage } from '../../api/client';
import type { ActionPayload } from '../../api/types';

/** Submit a workflow action, then go back to the queue with a confirmation message. */
export function useStageAction(appId: string) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mutation = useAction(appId);

  async function submit(payload: ActionPayload) {
    const res = await mutation.mutateAsync(payload);
    navigate('/', { state: { flash: t('action.done', { stage: t(`stages.${res.stage}`) }) } });
  }

  return {
    submit,
    busy: mutation.isPending,
    error: mutation.error ? errorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}

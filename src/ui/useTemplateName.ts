import { useI18n } from 'vue-i18n';
import { templateName } from '@/domain/templateName';
import { useSettings } from '@/ui/useSettings';

/** Name of a session: built-in template, or the name given to a custom session. */
export function useTemplateName() {
  const { t } = useI18n();
  const { settings } = useSettings();
  return (templateId: string) =>
    templateName(templateId, {
      translate: (key) => t(key),
      custom: settings.value?.customSessions ?? [],
      fallback: t('customSession.deleted'),
    });
}

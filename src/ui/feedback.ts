import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { deviceFromUserAgent, feedbackMailto } from '@/domain/feedback';
import { useUpdates } from '@/ui/updates';

/** The prefilled mailto link of "Send feedback", with the installed version and phone. */
export function useFeedbackLink() {
  const { t, locale } = useI18n();
  const { installed, supported } = useUpdates();
  return computed(() =>
    feedbackMailto({
      subject: t('feedback.subject'),
      intro: t('feedback.intro'),
      version: installed.value
        ? `${installed.value.versionName} (${installed.value.versionCode})`
        : supported
          ? '?'
          : 'web',
      device: deviceFromUserAgent(navigator.userAgent),
      language: String(locale.value),
    }),
  );
}

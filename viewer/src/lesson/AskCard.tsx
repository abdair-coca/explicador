// The question a reader answers before a step shows (F29): asked over the picture of the state before it.
import { t } from '../i18n';
/** How long autoplay leaves a question on the page before it shows the answer. */
export const ASK_MS = 5200;

export function AskCard({ question }: { question: string }) {
  return (
    <p className="ask-card animate-fade-up" role="status">
      <span className="ask-tag">{t('Predict')}</span>
      <span>{question}</span>
    </p>
  );
}

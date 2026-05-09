import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

const getRouteErrorMessage = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return error.statusText || error.data?.message || `HTTP ${error.status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown application error';
};

export function RouteErrorFallback() {
  const { t } = useTranslation();
  const error = useRouteError();
  const message = getRouteErrorMessage(error);

  return (
    <main className="route-error-page">
      <section className="route-error-panel" role="alert" aria-live="assertive">
        <h1>{t('route_error.title', { defaultValue: 'Application error' })}</h1>
        <p>{message}</p>
        <div className="route-error-actions">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            {t('route_error.reload', { defaultValue: 'Reload' })}
          </Button>
          <Button onClick={() => window.location.assign('#/')}>
            {t('route_error.go_home', { defaultValue: 'Go home' })}
          </Button>
        </div>
      </section>
    </main>
  );
}

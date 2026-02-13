import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Container, Stack, Typography } from '@/atoms';
import { useAuth } from '@/app/auth';

import s from './AuthCallbackPage.module.scss';

type CallbackState = 'loading' | 'error';

export function AuthCallbackPage() {
  const { exchangeGoogleCode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('Finishing Google sign-in.');

  const code = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('code');
  }, [location.search]);

  useEffect(() => {
    if (!code) {
      setState('error');
      setMessage('Missing authorization code.');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;

    exchangeGoogleCode({ code, redirectUri })
      .then(() => {
        navigate('/', { replace: true });
      })
      .catch((error: Error) => {
        setState('error');
        setMessage(error.message || 'Unable to complete Google sign-in.');
      });
  }, [code, exchangeGoogleCode, navigate]);

  return (
    <div className={s.page}>
      <Container size="narrow">
        <Stack gap="12px">
          <Typography variant="h2">
            {state === 'loading' ? 'Signing you in' : 'Sign-in failed'}
          </Typography>
          <Typography variant="body" tone="muted">
            {message}
          </Typography>
        </Stack>
      </Container>
    </div>
  );
}

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth';
import { toast } from '@/app/toast';
import Logo from '@/assets/logo/logo.png';
import {
  Button,
  Checkbox,
  Container,
  Field,
  Grid,
  Input,
  Stack,
  Typography,
} from '@/atoms';

import s from './AuthPage.module.scss';

export function AuthPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInValues, setSignInValues] = useState({
    email: '',
    password: '',
  });

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname: string } } | null;
    return state?.from?.pathname ?? '/';
  }, [location.state]);

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(redirectTo, { replace: true });
    }
  }, [status, navigate, redirectTo]);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignInLoading(true);
    try {
      await signIn(signInValues);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSignInLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <Container size="wide" className={s.container}>
        <Grid columns={2} gap="48px" className={s.grid}>
          <Stack gap="24px" className={s.intro}>
            <header className={s.logo}>
              <img src={Logo} alt="AIgf" />
            </header>
            <Typography variant="h1">AIgf Admin Console</Typography>
            <Typography variant="proseCompact" readingWidth className={s.copy}>
              Manage characters, send broadcasts, and monitor analytics from one
              console.
            </Typography>
            <Typography variant="meta" tone="muted">
              Sessions are stored in secure, httpOnly cookies.
            </Typography>
          </Stack>

          <section className={s.panel} aria-label="Authentication">
            <Stack gap="20px">
              <div className={s.panelHeader}>
                <Typography variant="h2">Sign in</Typography>
                <Typography variant="body" tone="muted">
                  Use your email to continue.
                </Typography>
              </div>

              <form className={s.form} onSubmit={handleSignIn}>
                <Field label="Email" labelFor="signin-email">
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@aigfonline.com"
                    autoComplete="email"
                    value={signInValues.email}
                    onChange={(event) =>
                      setSignInValues((values) => ({
                        ...values,
                        email: event.target.value,
                      }))
                    }
                    required
                    fullWidth
                  />
                </Field>
                <Field label="Password" labelFor="signin-password">
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={signInValues.password}
                    onChange={(event) =>
                      setSignInValues((values) => ({
                        ...values,
                        password: event.target.value,
                      }))
                    }
                    required
                    fullWidth
                  />
                </Field>
                <div className={s.formMeta}>
                  <Checkbox label="Remember this device" />
                </div>
                <Button type="submit" fullWidth loading={signInLoading}>
                  Sign in
                </Button>
              </form>
            </Stack>
          </section>
        </Grid>
      </Container>
    </div>
  );
}

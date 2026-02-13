import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryStatus,
} from '@tanstack/react-query';

import { buildGoogleAuthUrl } from './pkce';
import { getGoogleClientId } from '@/app/env';
import {
  exchangeGoogleCode,
  login,
  logout,
  confirmEmail as confirmEmailApi,
  confirmPasswordReset as confirmPasswordResetApi,
  changePassword as changePasswordApi,
  requestPasswordReset as requestPasswordResetApi,
  resendConfirmation as resendConfirmationApi,
  refreshAccessToken,
  register,
} from './authApi';
import { setAccessToken, subscribeAccessToken } from './tokens';
import { getCurrentUser, updateUser } from './userApi';
import type { IUser } from '@/common/types/user.type';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
type UserStatus = 'idle' | 'loading' | 'error' | 'success';

type AuthContextValue = {
  status: AuthStatus;
  user: IUser | null;
  userStatus: UserStatus;
  signIn: (input: { email: string; password: string }) => Promise<string | null>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<{ accessToken: string | null; requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  startGoogleLogin: (redirectUri: string) => Promise<void>;
  exchangeGoogleCode: (input: {
    code: string;
    redirectUri: string;
  }) => Promise<string | null>;
  confirmEmail: (input: { token: string }) => Promise<string | null>;
  resendConfirmation: (input: { email: string }) => Promise<void>;
  requestPasswordReset: (input: { email: string }) => Promise<void>;
  confirmPasswordReset: (input: {
    token: string;
    newPassword: string;
  }) => Promise<void>;
  changePassword: (input: {
    oldPassword: string;
    newPassword: string;
  }) => Promise<void>;
  refetchUser: () => Promise<void>;
  updateProfile: (input: {
    firstName: string;
    lastName: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const queryClient = useQueryClient();
  const {
    data: userData,
    status: userQueryStatus,
    refetch: refetchUserQuery,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: status === 'authenticated',
    retry: false,
  });

  const resolvedUserStatus: UserStatus =
    status === 'authenticated'
      ? mapQueryStatus(userQueryStatus)
      : 'idle';

  const updateProfileMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: async (_, payload) => {
      queryClient.setQueryData(['currentUser'], (prev) =>
        prev ? { ...(prev as IUser), ...payload } : prev,
      );
    },
  });

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAccessToken((token) => {
      if (!active) return;
      setStatus(token ? 'authenticated' : 'unauthenticated');
    });

    refreshAccessToken()
      .then((token) => {
        if (!active) return;
        setAccessToken(token);
        if (!token) {
          setStatus('unauthenticated');
        }
      })
      .catch(() => {
        if (!active) return;
        setAccessToken(null);
        setStatus('unauthenticated');
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: status === 'authenticated' ? userData ?? null : null,
      userStatus: resolvedUserStatus,
      signIn: login,
      signUp: register,
      signOut: async () => {
        await logout();
        await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      },
      startGoogleLogin: async (redirectUri: string) => {
        const clientId = getGoogleClientId();
        const url = await buildGoogleAuthUrl({ clientId, redirectUri });
        window.location.assign(url);
      },
      exchangeGoogleCode,
      confirmEmail: confirmEmailApi,
      resendConfirmation: async (input) => {
        await resendConfirmationApi(input);
      },
      requestPasswordReset: async (input) => {
        await requestPasswordResetApi(input);
      },
      confirmPasswordReset: async (input) => {
        await confirmPasswordResetApi(input);
      },
      changePassword: async (input) => {
        await changePasswordApi(input);
      },
      refetchUser: async () => {
        await refetchUserQuery();
      },
      updateProfile: async (input) => {
        await updateProfileMutation.mutateAsync(input);
      },
    }),
    [
      status,
      userData,
      resolvedUserStatus,
      queryClient,
      refetchUserQuery,
      updateProfileMutation,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function mapQueryStatus(status: QueryStatus): UserStatus {
  if (status === 'pending') {
    return 'loading';
  }
  if (status === 'error') {
    return 'error';
  }
  return 'success';
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

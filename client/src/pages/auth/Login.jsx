import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Flag } from 'lucide-react';
import AuthLayout, { AuthHeading } from './AuthLayout';
import AuthTabs from './AuthTabs';
import { Alert, Button, Checkbox, Field, Input } from '../../components/ui';
import { post } from '../../api/client';
import { useAuth } from '../../lib/auth';
import { DevLink } from './CheckInbox';

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setErrorMsg] = useState(null);
  const [devLink, setDevLink] = useState(null);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '', remember: false } });

  const onSubmit = async (values) => {
    setErrorMsg(null);
    try {
      const d = await post('/auth/login', values);
      setUser(d.user);
      const next = params.get('next');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
    } catch (e) {
      setErrorMsg({ message: e.message, unverified: e.code === 'UNVERIFIED' });
    }
  };

  const resend = async () => {
    const r = await post('/auth/resend-verification', { email: getValues('email') }).catch(() => ({}));
    setDevLink(r.devLink || null);
    setErrorMsg({ message: 'We sent a new verification link. Check your inbox.', ok: true });
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <AuthTabs value="login" />
        <AuthHeading title="Welcome back" sub="Log in with your university email." />
        {error && (
          <Alert tone={error.ok ? 'success' : 'danger'} icon={Flag}>
            {error.message}{' '}
            {error.unverified && (
              <button type="button" onClick={resend} className="font-semibold underline">
                Resend link
              </button>
            )}
          </Alert>
        )}
        <DevLink href={devLink} />
        <Field label="University email" id="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            error={errors.email}
            {...register('email', { required: 'Enter your university email' })}
          />
        </Field>
        <Field label="Password" id="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            error={errors.password}
            {...register('password', { required: 'Enter your password' })}
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <Checkbox label="Keep me logged in" {...register('remember')} />
          <Link to="/reset-password" className="text-sm font-semibold text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="h-12" loading={isSubmitting}>
          Log in
        </Button>
        <p className="text-center text-sm text-muted">
          New to CourseLens?{' '}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

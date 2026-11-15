import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthLayout, { AuthHeading } from './AuthLayout';
import { Alert, Button, Card, Field, Input } from '../../components/ui';
import { post } from '../../api/client';
import { useToast } from '../../components/Toast';
import { DevLink } from './CheckInbox';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [sent, setSent] = useState(null);
  const [error, setError] = useState('');
  const request = useForm({ defaultValues: { email: '' } });
  const reset = useForm({ defaultValues: { password: '', confirm: '' } });

  const sendLink = async ({ email }) => {
    const r = await post('/auth/forgot-password', { email }).catch((e) => ({ error: e.message }));
    if (r.error) return setError(r.error);
    setSent({ email, devLink: r.devLink });
    return undefined;
  };

  const save = async ({ password }) => {
    setError('');
    try {
      await post('/auth/reset-password', { token, password });
      toast('Password saved. Log in with your new password.');
      navigate('/login');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <Link to="/login" className="text-sm font-medium text-brand hover:underline">
            ← Back to log in
          </Link>
          <AuthHeading title="Reset your password" sub="Enter your university email and we'll send you a reset link." />
        </div>
        {error && <Alert>{error}</Alert>}
        <Card as="form" noValidate onSubmit={request.handleSubmit(sendLink)} className="flex flex-col gap-3.5 p-5">
          <p className="eyebrow text-brand-ink">Step 1 · Request a link</p>
          <Field label="University email" id="reset-email" error={request.formState.errors.email?.message}>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              error={request.formState.errors.email}
              {...request.register('email', { required: 'Enter your university email' })}
            />
          </Field>
          {sent ? <Alert tone="success">If {sent.email} has an account, a reset link is on its way. It expires in 1 hour.</Alert> : null}
          <Button type="submit" loading={request.formState.isSubmitting}>
            {sent ? 'Send again' : 'Send reset link'}
          </Button>
          <DevLink href={sent?.devLink} />
        </Card>
        <Card as="form" noValidate onSubmit={reset.handleSubmit(save)} className="flex flex-col gap-3.5 p-5" aria-disabled={!token}>
          <p className="eyebrow text-brand-ink">Step 2 · After opening the email link</p>
          <Field
            label="New password"
            id="new-password"
            hint="At least 8 characters, with a number."
            error={reset.formState.errors.password?.message}
          >
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              disabled={!token}
              error={reset.formState.errors.password}
              {...reset.register('password', {
                validate: (v) => (v.length >= 8 && /\d/.test(v)) || 'Use at least 8 characters, with a number',
              })}
            />
          </Field>
          <Field label="Confirm new password" id="confirm-password" error={reset.formState.errors.confirm?.message}>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              disabled={!token}
              error={reset.formState.errors.confirm}
              {...reset.register('confirm', { validate: (v, all) => v === all.password || 'Passwords do not match' })}
            />
          </Field>
          <Button type="submit" disabled={!token} loading={reset.formState.isSubmitting}>
            Save new password
          </Button>
          {!token && <p className="text-[13px] text-muted">Open the link from the email to choose a new password.</p>}
        </Card>
      </div>
    </AuthLayout>
  );
}

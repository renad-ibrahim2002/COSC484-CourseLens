import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { Button, Card } from '../../components/ui';
import { post } from '../../api/client';
import { useToast } from '../../components/Toast';

export function DevLink({ href }) {
  if (!href) return null;
  const path = href.replace(/^https?:\/\/[^/]+/, '');
  return (
    <p className="rounded-lg border border-dashed border-field bg-white px-3 py-2 text-xs text-muted">
      Development mode (no email service configured):{' '}
      <Link to={path} className="font-semibold text-brand underline">
        open the link
      </Link>
    </p>
  );
}

export default function CheckInbox() {
  const { state } = useLocation();
  const email = state?.email;
  const [devLink, setDevLink] = useState(state?.devLink);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const resend = async () => {
    if (!email) return;
    setSending(true);
    try {
      const r = await post('/auth/resend-verification', { email });
      if (r.devLink) setDevLink(r.devLink);
      toast('We sent a new verification link.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4 p-6">
          <span className="inline-flex size-11 items-center justify-center rounded-[14px] bg-brand-soft text-brand-ink">
            <Mail className="size-5" aria-hidden />
          </span>
          <h1 className="text-[26px] font-bold">Check your inbox</h1>
          <p className="text-[15px] leading-6 text-muted">
            We sent a verification link to {email ? <span className="text-ink">{email}</span> : 'your university email'}. Click it to
            activate your account. The link expires in 24 hours.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="md" className="h-11" onClick={resend} loading={sending} disabled={!email}>
              Resend link
            </Button>
            <Button to="/register" variant="ghost" size="md" className="h-11">
              Change email
            </Button>
          </div>
        </Card>
        <DevLink href={devLink} />
        <p className="text-center text-sm text-muted">
          Already verified?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

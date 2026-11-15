import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Check } from 'lucide-react';
import AuthLayout, { AuthHeading } from './AuthLayout';
import AuthTabs from './AuthTabs';
import { Button, Checkbox, Field, Input, Select, Alert } from '../../components/ui';
import { get, post } from '../../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [domain, setDomain] = useState({ university: null, majors: [], checked: false });
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', email: '', majorId: '', password: '', agree: false } });
  const email = watch('email');

  // Detect the university from the email domain as the student types (FR-01).
  useEffect(() => {
    const valid = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email || '');
    if (!valid) {
      setDomain({ university: null, majors: [], checked: false });
      return undefined;
    }
    const t = setTimeout(() => {
      get('/auth/email-domain', { email })
        .then((d) => setDomain({ ...d, checked: true }))
        .catch(() => setDomain({ university: null, majors: [], checked: true }));
    }, 300);
    return () => clearTimeout(t);
  }, [email]);

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const res = await post('/auth/register', values);
      navigate('/verify-email', { state: { email: res.email, devLink: res.devLink } });
    } catch (e) {
      const fields = e.fieldErrors?.() || {};
      Object.entries(fields).forEach(([k, m]) => setError(k, { message: m }));
      if (!Object.keys(fields).length) setServerError(e.message);
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <AuthTabs value="register" />
        <AuthHeading title="Create your account" sub="We'll send a link to verify your university email." />
        {serverError && <Alert>{serverError}</Alert>}
        <Field label="Full name" id="name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            error={errors.name}
            {...register('name', { required: 'Enter your full name', minLength: { value: 2, message: 'Enter your full name' } })}
          />
        </Field>
        <Field label="University email" id="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu.bh"
            error={errors.email}
            {...register('email', {
              required: 'Enter your university email',
              pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Enter a valid email' },
            })}
          />
          {domain.university ? (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-success-ink">
              <Check className="size-3.5" strokeWidth={3} aria-hidden /> {domain.university.name} detected
            </p>
          ) : (
            domain.checked && (
              <p className="text-[13px] text-muted">This email domain is not in the catalog yet. Use your university email.</p>
            )
          )}
        </Field>
        <Field label="Major" id="majorId" error={errors.majorId?.message}>
          <Select
            id="majorId"
            error={errors.majorId}
            disabled={!domain.majors.length}
            {...register('majorId', { required: 'Choose your major' })}
          >
            <option value="">{domain.majors.length ? 'Choose your major' : 'Enter your university email first'}</option>
            {domain.majors.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Password" id="password" error={errors.password?.message} hint="At least 8 characters, with a number.">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            error={errors.password}
            {...register('password', {
              required: 'Choose a password',
              validate: (v) => (v.length >= 8 && /\d/.test(v)) || 'Use at least 8 characters, with a number',
            })}
          />
        </Field>
        <div>
          <Checkbox
            label="I agree to the posting guidelines and to review courses, not people."
            {...register('agree', { required: 'Please agree to the posting guidelines' })}
          />
          {errors.agree && (
            <p role="alert" className="mt-1 text-[13px] text-danger">
              {errors.agree.message}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" className="h-12" loading={isSubmitting}>
          Create account
        </Button>
        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

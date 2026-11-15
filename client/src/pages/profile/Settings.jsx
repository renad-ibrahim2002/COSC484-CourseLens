import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Check, Lock } from 'lucide-react';
import { del, get, patch, post } from '../../api/client';
import { Button, Card, Field, Input, Modal, PageTitle, Select } from '../../components/ui';
import ProfileLayout from './ProfileLayout';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/Toast';

const Locked = ({ id, value }) => (
  <div className="relative">
    <Input id={id} value={value} readOnly aria-readonly className="bg-white pr-10" />
    <Lock className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" aria-label="Locked" />
  </div>
);

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const majors = useQuery({
    queryKey: ['majors', user.universityId],
    queryFn: () => get(`/universities/${user.universityId}/majors`, { sort: 'name' }),
  });
  const profile = useForm({ defaultValues: { name: user.name, majorId: user.majorId || '' } });
  const pw = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  // The major options load after the form mounts; re-apply the saved value once they arrive.
  useEffect(() => {
    if (majors.data) profile.reset({ name: profile.getValues('name'), majorId: user.majorId || '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [majors.data]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [deleting, setDeleting] = useState(false);

  const saveProfile = async (values) => {
    try {
      const r = await patch('/me', values);
      setUser(r.user);
      qc.invalidateQueries({ queryKey: ['me-summary'] });
      toast(r.majorChanged ? 'Saved. New posts will show your new major.' : 'Profile saved.');
    } catch (e) {
      profile.setError('name', { message: e.message });
    }
  };
  const savePassword = async (values) => {
    try {
      await post('/me/password', values);
      pw.reset();
      toast('Password updated. Other devices were signed out.');
    } catch (e) {
      const f = e.fieldErrors();
      if (Object.keys(f).length) Object.entries(f).forEach(([k, m]) => pw.setError(k, { message: m }));
      else pw.setError('currentPassword', { message: e.message });
    }
  };
  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await del('/me', { password: deletePw });
      await logout();
      toast('Your account was deleted.');
      navigate('/');
    } catch (e) {
      setDeleteErr(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ProfileLayout>
      <PageTitle>Account settings</PageTitle>
      <Card as="form" noValidate onSubmit={profile.handleSubmit(saveProfile)} className="flex flex-col gap-4 p-5">
        <h2 className="font-sans text-[17px] font-bold">Profile</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" id="s-name" error={profile.formState.errors.name?.message}>
            <Input
              id="s-name"
              error={profile.formState.errors.name}
              {...profile.register('name', { required: 'Enter your full name', minLength: { value: 2, message: 'Enter your full name' } })}
            />
          </Field>
          <Field label="University email" id="s-email">
            <Locked id="s-email" value={user.email} />
            <span className="flex items-center gap-1 text-[13px] font-medium text-success-ink">
              <Check className="size-3.5" strokeWidth={3} aria-hidden /> Verified
            </span>
          </Field>
          <Field label="University" id="s-uni" hint="Set from your email domain.">
            <Locked id="s-uni" value={user.university?.name || ''} />
          </Field>
          <Field label="Major" id="s-major">
            <Select id="s-major" {...profile.register('majorId')}>
              {majors.data?.majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="md" loading={profile.formState.isSubmitting}>
            Save changes
          </Button>
        </div>
      </Card>
      <Card as="form" noValidate onSubmit={pw.handleSubmit(savePassword)} className="flex flex-col gap-4 p-5">
        <h2 className="font-sans text-[17px] font-bold">Password</h2>
        <Field label="Current password" id="s-cur" error={pw.formState.errors.currentPassword?.message}>
          <Input
            id="s-cur"
            type="password"
            autoComplete="current-password"
            error={pw.formState.errors.currentPassword}
            {...pw.register('currentPassword', { required: 'Enter your current password' })}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="New password" id="s-new" error={pw.formState.errors.newPassword?.message}>
            <Input
              id="s-new"
              type="password"
              autoComplete="new-password"
              error={pw.formState.errors.newPassword}
              {...pw.register('newPassword', {
                validate: (v) => (v.length >= 8 && /\d/.test(v)) || 'Use at least 8 characters, with a number',
              })}
            />
          </Field>
          <Field label="Confirm new password" id="s-conf" error={pw.formState.errors.confirmPassword?.message}>
            <Input
              id="s-conf"
              type="password"
              autoComplete="new-password"
              error={pw.formState.errors.confirmPassword}
              {...pw.register('confirmPassword', { validate: (v, all) => v === all.newPassword || 'Passwords do not match' })}
            />
          </Field>
        </div>
        <p className="-mt-2 text-[13px] text-muted">At least 8 characters, with a number.</p>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" size="md" loading={pw.formState.isSubmitting}>
            Update password
          </Button>
        </div>
      </Card>
      <div className="flex flex-col gap-4 rounded-2xl border border-[#f0b9ad] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-sans text-[17px] font-bold text-danger-ink">Delete account</h2>
          <p className="text-sm text-muted">
            Your bookmarks are removed. Reviews and uploads you have not deleted stay on the site, still anonymous.
          </p>
        </div>
        <Button variant="danger-soft" size="md" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </div>
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger-soft" size="md" loading={deleting} disabled={!deletePw} onClick={deleteAccount}>
              Delete my account
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">This can't be undone. Enter your password to confirm.</p>
        <Field label="Password" id="del-pw" error={deleteErr}>
          <Input id="del-pw" type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} error={deleteErr} />
        </Field>
      </Modal>
    </ProfileLayout>
  );
}

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Search } from 'lucide-react';
import { get, patch } from '../../api/client';
import { Alert, Avatar, Card, Input, LoadingBlock, PageTitle, Pagination, Pill, Select } from '../../components/ui';
import { AdminLayout } from '../../components/ConsoleLayouts';
import { initials } from '../../lib/format';
import { useToast } from '../../components/Toast';

const ROLE_PILL = { moderator: 'warn', student: 'chip', admin: 'dark' };

export default function Users() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [role, setRole] = useState('all');
  const [universityId, setUniversityId] = useState('all');
  const [page, setPage] = useState(1);
  const toast = useToast();
  const qc = useQueryClient();
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const unis = useQuery({ queryKey: ['universities'], queryFn: () => get('/universities') });
  const { data } = useQuery({
    queryKey: ['admin-users', term, role, universityId, page],
    queryFn: () => get('/admin/users', { q: term, role, universityId, page }),
    placeholderData: (p) => p,
  });
  const change = async (u, newRole) => {
    try {
      await patch(`/admin/users/${u.id}/role`, { role: newRole });
      toast(`${u.name} is now ${newRole === 'admin' ? 'an admin' : `a ${newRole}`}.`);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return (
    <AdminLayout>
      <div className="flex flex-col gap-1.5">
        <PageTitle>Users &amp; roles</PageTitle>
        <p className="text-sm text-muted">Assign moderators per university. Only admins can change roles.</p>
      </div>
      <div className="flex flex-col gap-2.5 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" aria-hidden />
          <Input
            aria-label="Search name or email"
            placeholder="Search name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          wrapperClassName="md:w-[150px]"
        >
          <option value="all">All roles</option>
          <option value="student">Students</option>
          <option value="moderator">Moderators</option>
          <option value="admin">Admins</option>
        </Select>
        <Select
          aria-label="University"
          value={universityId}
          onChange={(e) => {
            setUniversityId(e.target.value);
            setPage(1);
          }}
          wrapperClassName="md:w-[180px]"
        >
          <option value="all">All universities</option>
          {unis.data?.universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.shortName}
            </option>
          ))}
        </Select>
      </div>
      {!data ? (
        <LoadingBlock />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <caption className="sr-only">Users</caption>
            <thead className="bg-page/70 text-[13px] text-muted">
              <tr className="border-b border-line">
                <th scope="col" className="px-4 py-3 font-medium">
                  User
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-3 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Change role
                </th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar text={initials(u.name)} size="sm" tone="chip" />
                      <div>
                        <p className="text-[15px] font-semibold">{u.name}</p>
                        <p className="text-[13px] text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Pill tone={ROLE_PILL[u.role]} size="sm" className="capitalize">
                      {u.role}
                    </Pill>
                  </td>
                  <td className="px-3 py-3">
                    {u.isVerified ? (
                      <Pill tone="success" size="sm">
                        Verified
                      </Pill>
                    ) : (
                      <Pill tone="chip" size="sm">
                        Unverified
                      </Pill>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      aria-label={`Change role for ${u.name}`}
                      value={u.role}
                      disabled={u.isSelf}
                      onChange={(e) => change(u, e.target.value)}
                      wrapperClassName="w-[150px]"
                      className="h-10 text-[15px]"
                    >
                      <option value="student">Student</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {data && <Pagination page={page} pages={data.pages} onChange={setPage} />}
      <Alert tone="brand" icon={Flag}>
        Making someone a moderator lets them hide and restore content at their university only. Role changes are saved to the audit log.
      </Alert>
    </AdminLayout>
  );
}

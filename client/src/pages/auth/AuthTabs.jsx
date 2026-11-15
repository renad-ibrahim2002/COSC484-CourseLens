import { useNavigate } from 'react-router-dom';
import { Segmented } from '../../components/ui';

export default function AuthTabs({ value }) {
  const navigate = useNavigate();
  return (
    <Segmented
      label="Account"
      value={value}
      onChange={(v) => navigate(v === 'login' ? '/login' : '/register')}
      items={[
        { value: 'login', label: 'Log in' },
        { value: 'register', label: 'Create account' },
      ]}
    />
  );
}

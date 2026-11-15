import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Meter, Pips, RatingButtons, FileBadge, Breadcrumbs, Segmented, ScoreChip } from '../components/ui';

describe('UI kit', () => {
  test('Meter exposes its value to assistive tech', () => {
    render(<Meter label="Difficulty" value={3.7} />);
    const meter = screen.getByRole('meter', { name: 'Difficulty' });
    expect(meter).toHaveAttribute('aria-valuenow', '3.7');
    expect(screen.getByText('3.7')).toBeInTheDocument();
  });

  test('Meter shows a dash when there are no ratings', () => {
    render(<Meter label="Workload" value={0} />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  test('Pips describes the rating in words', () => {
    render(<Pips value={3.8} label="Difficulty" />);
    expect(screen.getByRole('img', { name: 'Difficulty 3.8 out of 5' })).toBeInTheDocument();
  });

  test('RatingButtons are a keyboard-usable radio group', async () => {
    const onChange = vi.fn();
    render(<RatingButtons label="Overall" value={4} onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Overall: 4' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Overall: 2' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  test('FileBadge labels each file type', () => {
    render(
      <>
        <FileBadge kind="pdf" />
        <FileBadge kind="tip" />
      </>,
    );
    expect(screen.getByLabelText('PDF file')).toHaveTextContent('PDF');
    expect(screen.getByLabelText('TIP file')).toBeInTheDocument();
  });

  test('Breadcrumbs link every item but the current page', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Universities', to: '/universities' }, { label: 'AUBH' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByText('AUBH')).toHaveAttribute('aria-current', 'page');
  });

  test('Segmented reports the selected option', async () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="Account"
        value="login"
        onChange={onChange}
        items={[
          { value: 'login', label: 'Log in' },
          { value: 'register', label: 'Create account' },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Log in' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Create account' }));
    expect(onChange).toHaveBeenCalledWith('register');
  });

  test('ScoreChip always shows one decimal', () => {
    render(<ScoreChip value={5} />);
    expect(screen.getByText('5.0')).toBeInTheDocument();
  });
});

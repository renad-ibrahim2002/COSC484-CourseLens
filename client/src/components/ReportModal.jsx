import { useState } from 'react';
import { Button, Field, Modal, Select, Textarea } from './ui';
import { post } from '../api/client';
import { REASONS } from '../lib/format';
import { useToast } from './Toast';

export default function ReportModal({ target, onClose }) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async (e) => {
    e.preventDefault();
    if (!reason) return setError('Choose a reason');
    setBusy(true);
    try {
      await post('/reports', { targetType: target.type, targetId: target.id, reason, comment });
      toast('Thanks. A moderator will review it.');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };
  return (
    <Modal open={!!target} onClose={onClose} title={`Report this ${target?.type === 'resource' ? 'resource' : 'review'}`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-muted">Reports are private. A moderator at this university checks every report.</p>
        <Field label="Reason" id="report-reason" error={error}>
          <Select
            id="report-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            error={error}
          >
            <option value="">Choose a reason</option>
            {REASONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Comment" optional id="report-comment">
          <Textarea
            id="report-comment"
            maxLength={300}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What is wrong with it?"
          />
        </Field>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Send report
          </Button>
        </div>
      </form>
    </Modal>
  );
}

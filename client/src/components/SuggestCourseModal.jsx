import { useForm } from 'react-hook-form';
import { Button, Field, Input, Modal } from './ui';
import { post } from '../api/client';
import { useToast } from './Toast';

export default function SuggestCourseModal({ open, onClose, majorId, majorName }) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { code: '', title: '', credits: 3 } });
  const submit = async (values) => {
    try {
      await post('/suggestions/course', { ...values, majorId });
      toast('Thanks! An admin will review your suggestion.');
      reset();
      onClose();
    } catch (e) {
      setError('code', { message: e.message });
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Suggest a course for ${majorName}`}>
      <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted">Missing a course? An admin checks each suggestion before it is added to the catalog.</p>
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <Field label="Course code" id="sg-code" error={errors.code?.message}>
            <Input
              id="sg-code"
              placeholder="COSC 499"
              error={errors.code}
              {...register('code', {
                required: 'Enter a code',
                pattern: { value: /^[A-Za-z]{2,5} ?\d{3}[A-Za-z]?$/, message: 'Use a code like COSC 499' },
              })}
            />
          </Field>
          <Field label="Title" id="sg-title" error={errors.title?.message}>
            <Input
              id="sg-title"
              error={errors.title}
              {...register('title', { required: 'Enter the course title', minLength: { value: 3, message: 'Enter the course title' } })}
            />
          </Field>
        </div>
        <Field label="Credits" id="sg-credits">
          <Input id="sg-credits" type="number" min={0} max={30} className="w-24" {...register('credits', { valueAsNumber: true })} />
        </Field>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Send suggestion
          </Button>
        </div>
      </form>
    </Modal>
  );
}

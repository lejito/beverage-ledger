import type { ReactNode } from 'react';
import type { FormValidation } from '@/lib/forms';
import { FormAlert } from './FormAlert';

interface ValidatedFormProps<K extends string> {
  validation: FormValidation<K>;
  /** Runs only once every rule passes. */
  onValid: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * The form element useFormValidation expects: our own messages instead of the
 * browser's (`noValidate`), the ref the focus jump searches, and the summary on
 * top after a failed attempt.
 */
export function ValidatedForm<K extends string>({
  validation,
  onValid,
  className = 'space-y-4',
  children,
}: Readonly<ValidatedFormProps<K>>) {
  return (
    <form
      ref={validation.ref}
      noValidate
      onSubmit={validation.onSubmit(onValid)}
      className={className}
    >
      {validation.alert && <FormAlert title={validation.alert} />}
      {children}
    </form>
  );
}

import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Input.module.css';

type InputProps = {
  label?: string;
  error?: string;
  textarea?: boolean;
} & (
  | InputHTMLAttributes<HTMLInputElement>
  | TextareaHTMLAttributes<HTMLTextAreaElement>
);

export default function Input({
  label,
  error,
  textarea = false,
  className = '',
  ...props
}: InputProps) {
  const wrapperClasses = [
    styles.wrapper,
    error ? styles.hasError : '',
  ]
    .filter(Boolean)
    .join(' ');

  const inputClasses = [
    styles.input,
    textarea ? styles.textarea : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {label && <label className={styles.label}>{label}</label>}
      {textarea ? (
        <textarea
          className={inputClasses}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={inputClasses}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}

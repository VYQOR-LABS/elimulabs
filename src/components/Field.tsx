import type {
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

interface FieldProps {
  label: string;
  id: string;
  children?: ReactNode;
}

export function Field({
  label,
  id,
  children,
}: FieldProps): ReactElement {
  return (
    <label htmlFor={id} className="field-label">
      {label}
      {children}
    </label>
  );
}

export function Select({
  label,
  id,
  children,
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>): ReactElement {
  return (
    <Field label={label} id={id}>
      <select id={id} className="field-control" {...props}>
        {children}
      </select>
    </Field>
  );
}

export function Input({
  label,
  id,
  ...props
}: { label: string; id: string } & InputHTMLAttributes<HTMLInputElement>): ReactElement {
  return (
    <Field label={label} id={id}>
      <input id={id} className="field-control" {...props} />
    </Field>
  );
}

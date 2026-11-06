import React from 'react';
import { formatIsoDate, useTranslation } from '../../i18n';

interface DateInputProps {
  /** Stored `YYYY-MM-DD` value, or undefined when unset. */
  value?: string;
  onChange: (value?: string) => void;
  className?: string;
  'data-testid'?: string;
  'aria-label'?: string;
}

/**
 * Date field that shows the date in the app language's format. The native `<input type="date">`
 * follows the OS locale instead, so in pt-BR we draw our own DD/MM/YYYY label and keep the native
 * input invisible on top of it for the picker and keyboard entry.
 */
export const DateInput: React.FC<DateInputProps> = ({ value, onChange, className = '', ...rest }) => {
  const { language } = useTranslation();

  const nativeInput = (extraClass: string, onClick?: React.MouseEventHandler<HTMLInputElement>) => (
    <input
      type="date"
      data-testid={rest['data-testid']}
      aria-label={rest['aria-label']}
      value={value || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      onClick={onClick}
      className={extraClass}
    />
  );

  if (language !== 'pt-BR') return nativeInput(className);

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        data-testid={rest['data-testid'] ? `${rest['data-testid']}-display` : undefined}
        className={`${className} ${value ? '' : 'text-slate-400'}`}
      >
        {value ? formatIsoDate(value, language) : 'dd/mm/aaaa'}
      </div>
      {nativeInput('absolute inset-0 w-full h-full opacity-0 cursor-pointer', (e) => {
        try {
          e.currentTarget.showPicker?.();
        } catch {
          // showPicker is unavailable in some webviews; the native control still works
        }
      })}
    </div>
  );
};

export default DateInput;

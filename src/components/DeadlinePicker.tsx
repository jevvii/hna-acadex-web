'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDateTimePicker } from '@mui/x-date-pickers/StaticDateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import { DateOrTimeViewWithMeridiem } from '@mui/x-date-pickers/internals/models';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { Calendar } from 'lucide-react';

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#60a5fa' },
    background: {
      paper: '#1e293b',
      default: '#1e293b',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
      disabled: '#475569',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e293b',
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

function PickerShell({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}

function formatDate(date: Dayjs | null): string {
  if (!date) return '';
  return date.format('MMM D, YYYY h:mm A');
}

type PickerView = DateOrTimeViewWithMeridiem;

function ClockDateTimeInlinePicker({
  value,
  onChange,
  minDate,
  view,
  onViewChange,
}: {
  value: Dayjs;
  onChange: (date: Dayjs) => void;
  minDate?: Dayjs;
  view: PickerView;
  onViewChange: (view: PickerView) => void;
}) {
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 bg-slate-900/60">
      <StaticDateTimePicker
        value={value}
        onChange={(newValue) => {
          if (newValue) onChange(newValue);
        }}
        minDate={minDate}
        ampm
        view={view}
        onViewChange={(newView) => onViewChange(newView)}
        views={['day', 'hours', 'minutes']}
        viewRenderers={{
          hours: renderTimeViewClock,
          minutes: renderTimeViewClock,
          seconds: renderTimeViewClock,
        }}
        slotProps={{
          actionBar: { actions: [] },
          toolbar: { hidden: true },
          day: {
            sx: {
              color: '#f1f5f9',
              '&:hover': { backgroundColor: '#334155' },
              '&.Mui-selected': {
                backgroundColor: '#60a5fa !important',
                color: '#ffffff',
              },
              '&.MuiPickersDay-today': {
                border: '1px solid #60a5fa',
                color: '#60a5fa',
              },
            },
          },
          calendarHeader: {
            sx: {
              '& .MuiPickersCalendarHeader-label': { color: '#f1f5f9' },
              '& .MuiPickersCalendarHeader-switchViewButton': { color: '#f1f5f9' },
              '& .MuiIconButton-root': { color: '#f1f5f9' },
            },
          },
        }}
      />
    </div>
  );
}

function ClockDateTimeModal({
  isOpen,
  pendingDate,
  onPendingDateChange,
  onCancel,
  onConfirm,
  minDate,
}: {
  isOpen: boolean;
  pendingDate: Dayjs;
  onPendingDateChange: (date: Dayjs) => void;
  onCancel: () => void;
  onConfirm: () => void;
  minDate?: Dayjs;
}) {
  const [pickerView, setPickerView] = useState<PickerView>('day');

  const isDateView = pickerView === 'day';
  const isTimeView = pickerView === 'hours' || pickerView === 'minutes';
  const meridiem = pendingDate.hour() >= 12 ? 'PM' : 'AM';

  const handleMeridiemChange = (nextMeridiem: 'AM' | 'PM') => {
    const hour = pendingDate.hour();
    if (nextMeridiem === 'AM' && hour >= 12) {
      onPendingDateChange(pendingDate.subtract(12, 'hour'));
      return;
    }
    if (nextMeridiem === 'PM' && hour < 12) {
      onPendingDateChange(pendingDate.add(12, 'hour'));
    }
  };

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl shadow-2xl overflow-hidden bg-slate-800"
      >
        <ClockDateTimeInlinePicker
          value={pendingDate}
          onChange={onPendingDateChange}
          minDate={minDate}
          view={pickerView}
          onViewChange={setPickerView}
        />
        {isTimeView && (
          <div className="flex items-center justify-center gap-3 px-4 py-2 bg-slate-800/50">
            <span className="text-2xl font-light text-white">
              {pendingDate.format('h:mm')}
            </span>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => handleMeridiemChange('AM')}
                aria-pressed={meridiem === 'AM'}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition-all ${
                  meridiem === 'AM'
                    ? 'bg-white text-slate-900'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => handleMeridiemChange('PM')}
                aria-pressed={meridiem === 'PM'}
                className={`px-2 py-0.5 text-xs font-semibold rounded transition-all ${
                  meridiem === 'PM'
                    ? 'bg-white text-slate-900'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                PM
              </button>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 px-4 pb-4 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (isDateView) {
                setPickerView('hours');
                return;
              }
              onConfirm();
            }}
            className="px-4 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors rounded-lg"
          >
            {isDateView ? 'Next' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface DeadlinePickerProps {
  label: string;
  value: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  defaultChecked?: boolean;
  disabled?: boolean;
}

export function DeadlinePicker({
  label,
  value,
  onChange,
  defaultChecked = false,
  disabled = false,
}: DeadlinePickerProps) {
  const [hasDeadline, setHasDeadline] = useState(defaultChecked || !!value);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Dayjs>(value ?? dayjs());

  const effectiveHasDeadline = hasDeadline || !!value;
  const selectedDate = value ?? pendingDate;

  const handleCheckboxToggle = useCallback((checked: boolean) => {
    setHasDeadline(checked);
    if (!checked) {
      setIsPickerOpen(false);
      onChange(null);
      return;
    }
    setPendingDate(value ?? dayjs());
    setIsPickerOpen(true);
  }, [onChange, value]);

  return (
    <PickerShell>
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={effectiveHasDeadline}
            onChange={(e) => handleCheckboxToggle(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
          />
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </label>

        {effectiveHasDeadline && (
          <>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-navy-600" />
              <button
                type="button"
                onClick={() => {
                  setPendingDate(selectedDate);
                  setIsPickerOpen(true);
                }}
                className="flex-1 text-left px-3 py-2 border border-gray-300 rounded-lg hover:border-navy-500 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors bg-white"
              >
                {selectedDate ? (
                  <span className="text-gray-900">{formatDate(selectedDate)}</span>
                ) : (
                  <span className="text-gray-400">Click to select date...</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {isPickerOpen && (
        <ClockDateTimeModal
          isOpen={isPickerOpen}
          pendingDate={pendingDate}
          onPendingDateChange={setPendingDate}
          onCancel={() => setIsPickerOpen(false)}
          onConfirm={() => {
            onChange(pendingDate);
            setIsPickerOpen(false);
          }}
          minDate={dayjs()}
        />
      )}
    </PickerShell>
  );
}

export interface DeadlinePickerTriggerProps {
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  hasDeadline: boolean;
  onHasDeadlineChange?: (value: boolean) => void;
  checkboxLabel?: string;
  showAllowLate?: boolean;
  allowLate?: boolean;
  onAllowLateChange?: (value: boolean) => void;
  disabled?: boolean;
}

export function DeadlinePickerTrigger({
  value,
  onChange,
  hasDeadline,
  onHasDeadlineChange,
  checkboxLabel = 'Set Deadline',
  showAllowLate = true,
  allowLate = true,
  onAllowLateChange,
  disabled = false,
}: DeadlinePickerTriggerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Dayjs>(value ?? dayjs());
  const selectedDate = value ?? pendingDate;

  const handleToggle = useCallback((checked: boolean) => {
    onHasDeadlineChange?.(checked);
    if (!checked) {
      setIsPickerOpen(false);
      onChange(null);
      return;
    }
    setPendingDate(value ?? dayjs());
    setIsPickerOpen(true);
  }, [onChange, onHasDeadlineChange, value]);

  return (
    <PickerShell>
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasDeadline}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
          />
          <span className="text-sm font-medium text-gray-700">{checkboxLabel}</span>
        </label>

        {hasDeadline && (
          <>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-navy-600" />
              <button
                type="button"
                onClick={() => {
                  setPendingDate(selectedDate);
                  setIsPickerOpen(true);
                }}
                className="flex-1 text-left px-3 py-2 border border-gray-300 rounded-lg hover:border-navy-500 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors bg-white"
              >
                {selectedDate ? (
                  <span className="text-gray-900">{formatDate(selectedDate)}</span>
                ) : (
                  <span className="text-gray-400">Click to select deadline...</span>
                )}
              </button>
            </div>

            {showAllowLate && (
              <label className="flex items-center gap-2 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={allowLate}
                  onChange={(e) => onAllowLateChange?.(e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 text-navy-600 border-gray-300 rounded focus:ring-navy-500"
                />
                <span className="text-sm text-gray-600">Allow Late Submissions</span>
              </label>
            )}
          </>
        )}
      </div>

      {isPickerOpen && (
        <ClockDateTimeModal
          isOpen={isPickerOpen}
          pendingDate={pendingDate}
          onPendingDateChange={setPendingDate}
          onCancel={() => {
            setIsPickerOpen(false);
            if (!value) onHasDeadlineChange?.(false);
          }}
          onConfirm={() => {
            onChange(pendingDate);
            setIsPickerOpen(false);
          }}
          minDate={dayjs()}
        />
      )}
    </PickerShell>
  );
}

export interface DateTimePickerTriggerProps {
  label: string;
  value: Dayjs;
  onChange: (value: Dayjs) => void;
  disabled?: boolean;
  minDate?: Dayjs;
}

export function DateTimePickerTrigger({
  label,
  value,
  onChange,
  disabled = false,
  minDate,
}: DateTimePickerTriggerProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Dayjs>(value);

  return (
    <PickerShell>
      <div>
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-2 mt-1">
          <Calendar className="w-4 h-4 text-navy-600" />
          <button
            type="button"
            onClick={() => {
              if (disabled) return;
              setPendingDate(value);
              setIsPickerOpen(true);
            }}
            className="flex-1 text-left px-3 py-2 border border-gray-300 rounded-lg hover:border-navy-500 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors bg-white"
            disabled={disabled}
          >
            <span className="text-gray-900">{formatDate(value)}</span>
          </button>
        </div>
      </div>

      {isPickerOpen && (
        <ClockDateTimeModal
          isOpen={isPickerOpen}
          pendingDate={pendingDate}
          onPendingDateChange={setPendingDate}
          onCancel={() => setIsPickerOpen(false)}
          onConfirm={() => {
            onChange(pendingDate);
            setIsPickerOpen(false);
          }}
          minDate={minDate}
        />
      )}
    </PickerShell>
  );
}

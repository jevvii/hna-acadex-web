'use client';

import { useState, useCallback, useEffect } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDateTimePicker } from '@mui/x-date-pickers/StaticDateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import { DateOrTimeViewWithMeridiem } from '@mui/x-date-pickers/internals/models';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import dayjs, { Dayjs } from 'dayjs';
import { Calendar } from 'lucide-react';

// MUI dark theme matching the navy modal aesthetic
const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#60a5fa',
    },
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
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#f1f5f9',
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
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e293b',
          borderRadius: '16px',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#f1f5f9',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
  },
});

type PickerView = DateOrTimeViewWithMeridiem;

interface DeadlinePickerTriggerProps {
  /** Current confirmed deadline value from parent */
  value: Dayjs | null;
  /** Called when deadline is confirmed (after clicking OK) */
  onChange: (value: Dayjs | null) => void;
  /** Whether deadline checkbox is checked */
  hasDeadline: boolean;
  /** Called when hasDeadline checkbox changes */
  onHasDeadlineChange?: (value: boolean) => void;
  /** Label for the checkbox */
  checkboxLabel?: string;
  /** Whether to show the allow late submissions checkbox */
  showAllowLate?: boolean;
  /** Current allow late submissions value */
  allowLate?: boolean;
  /** Called when allow late submissions changes */
  onAllowLateChange?: (value: boolean) => void;
  /** Whether the deadline input is disabled */
  disabled?: boolean;
}

/**
 * Legacy deadline picker for activity creation with "Allow Late Submissions" option.
 * For simpler use cases, use the DeadlinePicker component instead.
 */
export function DeadlinePickerTrigger({
  value: confirmedDate,
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
  const [pendingDate, setPendingDate] = useState<Dayjs | null>(null);
  const [pickerView, setPickerView] = useState<PickerView>('day');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (pendingDate) {
      setAmpm(pendingDate.hour() >= 12 ? 'PM' : 'AM');
    }
  }, [pendingDate]);

  const handleAmpmChange = useCallback((value: 'AM' | 'PM') => {
    setAmpm(value);
    if (!pendingDate) return;
    const hour = pendingDate.hour();
    if (value === 'AM' && hour >= 12) {
      setPendingDate(pendingDate.subtract(12, 'hour'));
    } else if (value === 'PM' && hour < 12) {
      setPendingDate(pendingDate.add(12, 'hour'));
    }
  }, [pendingDate]);

  const handleCheckboxToggle = useCallback((checked: boolean) => {
    onHasDeadlineChange?.(checked);
    if (checked) {
      const base = confirmedDate ?? dayjs();
      setAmpm(base.hour() >= 12 ? 'PM' : 'AM');
      setPickerView('day');
      setPendingDate(base);
      setIsPickerOpen(true);
    } else {
      setIsPickerOpen(false);
      setPendingDate(null);
      onChange(null);
    }
  }, [confirmedDate, onChange, onHasDeadlineChange]);

  const handleDateClick = useCallback(() => {
    if (hasDeadline) {
      const base = confirmedDate ?? dayjs();
      setAmpm(base.hour() >= 12 ? 'PM' : 'AM');
      setPickerView('day');
      setPendingDate(base);
      setIsPickerOpen(true);
    }
  }, [hasDeadline, confirmedDate]);

  const handlePickerChange = useCallback((newValue: Dayjs | null) => {
    setPendingDate(newValue);
  }, []);

  const handleViewChange = useCallback((newView: PickerView) => {
    setPickerView(newView);
  }, []);

  const handleAccept = useCallback(() => {
    const finalValue = pendingDate ?? dayjs();
    onChange(finalValue);
    setIsPickerOpen(false);
  }, [pendingDate, onChange]);

  const handleCancel = useCallback(() => {
    setIsPickerOpen(false);
    setPendingDate(null);
    setPickerView('day');
    if (!confirmedDate) {
      onHasDeadlineChange?.(false);
    }
  }, [confirmedDate, onHasDeadlineChange]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }, [handleCancel]);

  const formatDeadline = (date: Dayjs | null): string => {
    if (!date) return '';
    return date.format('MMM D, YYYY h:mm A');
  };

  const isTimeView = pickerView === 'hours' || pickerView === 'minutes';

  const formatTimeDisplay = (date: Dayjs | null): string => {
    if (!date) return '--:--';
    const hours = date.hour();
    const minutes = date.minute();
    const h = hours % 12 || 12;
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasDeadline}
              onChange={(e) => handleCheckboxToggle(e.target.checked)}
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
                  onClick={handleDateClick}
                  className="flex-1 text-left px-3 py-2 border border-gray-300 rounded-lg hover:border-navy-500 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none transition-colors bg-white"
                >
                  {confirmedDate ? (
                    <span className="text-gray-900">{formatDeadline(confirmedDate)}</span>
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
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
            onClick={handleBackdropClick}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: '#1e293b' }}
            >
              <StaticDateTimePicker
                value={pendingDate ?? dayjs()}
                onChange={handlePickerChange}
                onViewChange={handleViewChange}
                view={pickerView}
                minDate={dayjs()}
                ampm={true}
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
                sx={{
                  '& .MuiTimePickerToolbar-ampmSelection': { display: 'none !important' },
                  '& .MuiToggleButtonGroup-root': { display: 'none !important' },
                }}
              />

              {isTimeView && (
                <div className="flex items-center justify-center gap-3 px-4 py-2 bg-slate-800/50">
                  <span className="text-2xl font-light text-white">
                    {formatTimeDisplay(pendingDate)}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleAmpmChange('AM')}
                      className={`px-2 py-0.5 text-xs font-semibold rounded transition-all ${
                        ampm === 'AM'
                          ? 'text-white bg-slate-600'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAmpmChange('PM')}
                      className={`px-2 py-0.5 text-xs font-semibold rounded transition-all ${
                        ampm === 'PM'
                          ? 'text-white bg-slate-600'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
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
                  onClick={handleCancel}
                  className="px-4 py-1.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg"
                >
                  Cancel
                </button>
                {isTimeView ? (
                  <button
                    type="button"
                    onClick={handleAccept}
                    className="px-4 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors rounded-lg"
                  >
                    OK
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerView('hours')}
                    className="px-4 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors rounded-lg"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
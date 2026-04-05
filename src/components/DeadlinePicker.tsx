'use client';

import { useState, useCallback } from 'react';
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
      main: '#60a5fa', // blue-400 for better visibility
    },
    background: {
      paper: '#1e293b', // slate-800 dark navy
      default: '#1e293b',
    },
    text: {
      primary: '#f1f5f9', // slate-100 - bright white for day numbers
      secondary: '#94a3b8', // slate-400 - muted for day-of-week headers
      disabled: '#475569', // slate-600 - for days outside current month
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
          color: '#f1f5f9', // bright white for prev/next arrows
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
  },
});

// View type for the picker - use MUI's type
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
 * A complete deadline picker UI with:
 * - Checkbox to enable/disable deadline
 * - Clickable date display that opens a modal with analog clock
 * - Two-step flow: Date first → Next → Time → OK
 * - Optional "Allow Late Submissions" checkbox
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
  // Internal state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Dayjs | null>(null);
  const [pickerView, setPickerView] = useState<PickerView>('day');

  // When checkbox is toggled on, open picker with default date
  const handleCheckboxToggle = useCallback((checked: boolean) => {
    onHasDeadlineChange?.(checked);
    if (checked) {
      // Always start from date view
      setPickerView('day');
      setPendingDate(confirmedDate ?? dayjs());
      setIsPickerOpen(true);
    } else {
      // Unchecking: clear everything
      setIsPickerOpen(false);
      setPendingDate(null);
      onChange(null);
    }
  }, [confirmedDate, onChange, onHasDeadlineChange]);

  // Clicking the date display string to re-edit
  const handleDateClick = useCallback(() => {
    if (hasDeadline) {
      // Always start from date view when re-editing
      setPickerView('day');
      setPendingDate(confirmedDate ?? dayjs());
      setIsPickerOpen(true);
    }
  }, [hasDeadline, confirmedDate]);

  // While user is browsing dates/times - only update pending
  const handlePickerChange = useCallback((newValue: Dayjs | null) => {
    setPendingDate(newValue);
  }, []);

  // Handle view changes from the picker
  const handleViewChange = useCallback((newView: PickerView) => {
    setPickerView(newView);
  }, []);

  // User clicks OK (only on time view) - commit the pending date
  const handleAccept = useCallback(() => {
    const finalValue = pendingDate ?? dayjs();
    onChange(finalValue);
    setIsPickerOpen(false);
  }, [pendingDate, onChange]);

  // User clicks Cancel
  const handleCancel = useCallback(() => {
    setIsPickerOpen(false);
    setPendingDate(null);
    setPickerView('day');
    // If no date was ever confirmed, uncheck the checkbox
    if (!confirmedDate) {
      onHasDeadlineChange?.(false);
    }
  }, [confirmedDate, onHasDeadlineChange]);

  // Handle backdrop click (same as cancel)
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }, [handleCancel]);

  // Format the date for display
  const formatDeadline = (date: Dayjs | null): string => {
    if (!date) return '';
    return date.format('MMM D, YYYY h:mm A');
  };

  // Determine if we're on time view
  const isTimeView = pickerView === 'hours' || pickerView === 'minutes';

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

        {/* Modal overlay for the picker - high z-index to appear above other modals */}
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
              {/* MUI picker with NO built-in action bar */}
              <StaticDateTimePicker
                value={pendingDate ?? dayjs()}
                onChange={handlePickerChange}
                onViewChange={handleViewChange}
                view={pickerView}
                minDate={dayjs()}
                ampm
                views={['day', 'hours', 'minutes']}
                viewRenderers={{
                  hours: renderTimeViewClock,
                  minutes: renderTimeViewClock,
                  seconds: renderTimeViewClock,
                }}
                slotProps={{
                  // Disable MUI's built-in action bar entirely
                  actionBar: { actions: [] },
                  toolbar: {
                    sx: {
                      '& .MuiTypography-root': {
                        color: '#f1f5f9',
                      },
                    },
                  },
                  // Style the day picker elements
                  day: {
                    sx: {
                      color: '#f1f5f9', // bright white for day numbers
                      '&:hover': {
                        backgroundColor: '#334155', // slate-700 on hover
                      },
                      '&.Mui-selected': {
                        backgroundColor: '#60a5fa !important', // blue for selected day
                        color: '#ffffff',
                      },
                      '&.MuiPickersDay-today': {
                        border: '1px solid #60a5fa', // blue ring for today
                        color: '#60a5fa',
                      },
                    },
                  },
                  calendarHeader: {
                    sx: {
                      '& .MuiPickersCalendarHeader-label': {
                        color: '#f1f5f9', // bright white for month label
                      },
                      '& .MuiPickersCalendarHeader-switchViewButton': {
                        color: '#f1f5f9',
                      },
                      '& .MuiIconButton-root': {
                        color: '#f1f5f9', // prev/next arrows
                      },
                    },
                  },
                }}
                sx={{
                  // AM/PM selector styling
                  '& .MuiTimePickerToolbar-ampmLabel': {
                    color: '#475569', // slate-600 — unselected, muted
                    fontSize: '0.9rem',
                    fontWeight: 400,
                  },
                  '& .MuiTimePickerToolbar-ampmLabel.Mui-selected': {
                    color: '#60a5fa', // blue-400 — selected
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  },
                  '& .MuiToggleButtonGroup-root .MuiToggleButton-root': {
                    color: '#475569', // unselected AM/PM
                    '&.Mui-selected': {
                      color: '#f1f5f9', // selected AM/PM
                      backgroundColor: '#334155', // slate-700
                      fontWeight: 700,
                    },
                  },
                }}
              />

              {/* Custom action bar INSIDE the same card div */}
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
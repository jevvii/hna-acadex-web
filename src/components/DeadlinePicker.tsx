'use client';

import { useState, useEffect, useCallback } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDateTimePicker } from '@mui/x-date-pickers/StaticDateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
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
      primary: '#ffffff',
      secondary: '#94a3b8', // slate-400
    },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#ffffff',
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
          color: '#94a3b8',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
  },
});

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
 * - Optional "Allow Late Submissions" checkbox
 */
export function DeadlinePickerTrigger({
  value: confirmedDate, // Renamed for clarity - this is the parent's confirmed value
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
  const [pendingDate, setPendingDate] = useState<Dayjs | null>(null); // In-picker selection (before OK)

  // When checkbox is toggled on, open picker with default date
  const handleCheckboxToggle = useCallback((checked: boolean) => {
    onHasDeadlineChange?.(checked);
    if (checked) {
      // Pre-select current date/time or existing confirmed date
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
      setPendingDate(confirmedDate ?? dayjs());
      setIsPickerOpen(true);
    }
  }, [hasDeadline, confirmedDate]);

  // While user is browsing dates/times (before OK) - only update pending
  const handlePickerChange = useCallback((newValue: Dayjs | null) => {
    setPendingDate(newValue);
  }, []);

  // User clicks OK - commit the pending date
  const handleAccept = useCallback(() => {
    const finalValue = pendingDate ?? dayjs(); // Fallback to now if somehow null
    onChange(finalValue);
    setIsPickerOpen(false);
    // Keep hasDeadline true - the date is confirmed
  }, [pendingDate, onChange]);

  // User clicks Cancel
  const handleCancel = useCallback(() => {
    setIsPickerOpen(false);
    setPendingDate(null);
    // If no date was ever confirmed, uncheck the checkbox
    if (!confirmedDate) {
      onHasDeadlineChange?.(false);
    }
    // If a date was confirmed, keep it - just close the picker
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

        {/* Modal overlay for the picker */}
        {isPickerOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={handleBackdropClick}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <StaticDateTimePicker
                value={pendingDate ?? dayjs()}
                onChange={handlePickerChange}
                onAccept={handleAccept}
                onClose={handleCancel}
                minDate={dayjs()}
                ampm
                viewRenderers={{
                  hours: renderTimeViewClock,
                  minutes: renderTimeViewClock,
                  seconds: renderTimeViewClock,
                }}
                slotProps={{
                  actionBar: {
                    actions: ['cancel', 'accept'],
                    sx: {
                      '& .MuiButton-root': {
                        color: '#60a5fa',
                      },
                    },
                  },
                  toolbar: {
                    sx: {
                      '& .MuiTypography-root': {
                        color: '#ffffff',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
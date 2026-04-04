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
  /** Current deadline value */
  value: Dayjs | null;
  /** Called when the deadline changes (after clicking OK) */
  onChange: (value: Dayjs | null) => void;
  /** Whether deadline is enabled */
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
  const [tempValue, setTempValue] = useState<Dayjs | null>(null);

  // Open picker when deadline checkbox is newly checked
  useEffect(() => {
    if (hasDeadline && !value && !isPickerOpen) {
      // Small delay to let checkbox animation complete
      const timer = setTimeout(() => {
        setTempValue(dayjs()); // Start with current date/time
        setIsPickerOpen(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasDeadline, value, isPickerOpen]);

  // Handle checkbox toggle
  const handleCheckboxChange = useCallback((checked: boolean) => {
    onHasDeadlineChange?.(checked);
    if (!checked) {
      // Unchecking: clear deadline and close picker
      setIsPickerOpen(false);
      onChange(null);
      setTempValue(null);
    }
  }, [onHasDeadlineChange, onChange]);

  // Open picker when clicking the date button
  const handleDateClick = useCallback(() => {
    if (hasDeadline) {
      setTempValue(value || dayjs()); // Use existing value or default to now
      setIsPickerOpen(true);
    }
  }, [hasDeadline, value]);

  // Cancel button: close picker, uncheck if no prior value
  const handleCancel = useCallback(() => {
    setIsPickerOpen(false);
    if (!value) {
      // No date was previously selected, uncheck the checkbox
      onHasDeadlineChange?.(false);
    }
    setTempValue(null);
  }, [value, onHasDeadlineChange]);

  // OK/Accept button: save the selected date
  const handleAccept = useCallback(() => {
    if (tempValue) {
      onChange(tempValue);
    }
    setIsPickerOpen(false);
    setTempValue(null);
  }, [tempValue, onChange]);

  // Handle clicking the backdrop (outside the picker)
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
              onChange={(e) => handleCheckboxChange(e.target.checked)}
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
                  {value ? (
                    <span className="text-gray-900">{formatDeadline(value)}</span>
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
                value={tempValue}
                onChange={(newValue) => setTempValue(newValue)}
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
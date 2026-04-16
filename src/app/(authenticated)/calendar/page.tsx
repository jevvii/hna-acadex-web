'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import dayjs, { Dayjs } from 'dayjs';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Tag,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { calendarApi } from '@/lib/api';
import { DateTimePickerTrigger } from '@/components/DeadlinePicker';
import { CalendarEvent, EventType } from '@/lib/types';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const viewModes = ['day', 'week', 'month'] as const;
type CalendarViewMode = (typeof viewModes)[number];

const eventTypeColors: Record<EventType, string> = {
  deadline: '#F59E0B',
  exam: '#EF4444',
  personal: '#3B82F6',
  holiday: '#10B981',
  school_event: '#8B5CF6',
};

const eventTypeLabels: Record<EventType, string> = {
  deadline: 'Deadline',
  exam: 'Exam',
  personal: 'Personal',
  holiday: 'Holiday',
  school_event: 'School Event',
};
const creatableEventTypes: EventType[] = ['deadline', 'exam', 'personal', 'school_event'];

interface EventFormState {
  title: string;
  description: string;
  eventType: EventType;
  startAt: Dayjs;
  allDay: boolean;
  hasEnd: boolean;
  endAt: Dayjs;
}

function formatDateForAPI(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return formatDateForAPI(date);
}

function withDays(date: Date, daysToAdd: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + daysToAdd);
  return next;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function eventTimeLabel(event: CalendarEvent): string {
  if (event.all_day) return 'All day';
  return new Date(event.start_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function eventColor(event: CalendarEvent): string {
  return event.color || eventTypeColors[event.event_type] || '#94A3B8';
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [eventForm, setEventForm] = useState<EventFormState>(() => {
    const base = dayjs().second(0).millisecond(0);
    return {
      title: '',
      description: '',
      eventType: 'personal',
      startAt: base.hour(9).minute(0),
      allDay: false,
      hasEnd: false,
      endAt: base.hour(10).minute(0),
    };
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => calendarApi.getEvents(
      formatDateForAPI(startOfMonth),
      formatDateForAPI(endOfMonth),
    ),
  });

  const eventList = useMemo<CalendarEvent[]>(() => {
    if (!events) return [];
    if (Array.isArray(events)) return events;
    const paginated = events as unknown as { results?: CalendarEvent[] };
    return paginated.results ?? [];
  }, [events]);

  const eventsByDate = useMemo(() => {
    return eventList.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      const dateKey = formatDateKey(event.start_at);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {});
  }, [eventList]);

  const getEventsForDate = (dateKey: string): CalendarEvent[] => {
    const dayEvents = eventsByDate[dateKey] ?? [];
    return [...dayEvents].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  };

  const selectedDateEvents = selectedDate
    ? getEventsForDate(formatDateForAPI(selectedDate))
    : [];

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...eventList]
      .filter((event) => new Date(event.start_at) >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 10);
  }, [eventList]);

  const weekDates = useMemo(() => {
    const base = selectedDate ?? new Date();
    const weekStart = startOfWeek(base);
    return Array.from({ length: 7 }, (_, index) => withDays(weekStart, index));
  }, [selectedDate]);

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!eventForm.title.trim()) {
        throw new Error('Event title is required.');
      }
      if (eventForm.eventType === 'holiday') {
        throw new Error('Holiday events are system-managed and cannot be added manually.');
      }

      const startAt = eventForm.allDay
        ? eventForm.startAt.startOf('day').add(12, 'hour').toDate()
        : eventForm.startAt.toDate();
      let endAt: Date | null = null;

      if (eventForm.hasEnd) {
        endAt = eventForm.allDay
          ? eventForm.endAt.startOf('day').add(12, 'hour').toDate()
          : eventForm.endAt.toDate();
        if (endAt < startAt) {
          throw new Error('End date/time must be after start date/time.');
        }
      }

      return calendarApi.createEvent({
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || undefined,
        event_type: eventForm.eventType,
        start_at: startAt.toISOString(),
        end_at: endAt ? endAt.toISOString() : undefined,
        all_day: eventForm.allDay,
        color: eventTypeColors[eventForm.eventType],
        is_personal: true,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setSelectedDate(eventForm.startAt.toDate());
      setIsAddEventOpen(false);
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Failed to create event.');
    },
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const openAddEvent = () => {
    const anchor = selectedDate ?? new Date();
    const base = dayjs(anchor).second(0).millisecond(0);
    setEventForm({
      title: '',
      description: '',
      eventType: 'personal',
      startAt: base.hour(9).minute(0),
      allDay: false,
      hasEnd: false,
      endAt: base.hour(10).minute(0),
    });
    setFormError('');
    setIsAddEventOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="font-display text-3xl font-bold text-navy-800">Calendar</h1>
          <p className="text-red-500 mt-4">Failed to load events. Please try again later.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-navy-800">Calendar</h1>
          <p className="text-gray-500 mt-1">View schedules, deadlines, and your personal events</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            {viewModes.map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                  viewMode === mode ? 'bg-navy-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            onClick={openAddEvent}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-600 text-white font-medium hover:bg-navy-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_22rem] gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-card p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold text-navy-800">
              {monthNames[month]} {year}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {viewMode === 'month' && (
            <>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {days.map((day) => (
                  <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[88px] sm:min-h-[104px]" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const cellDate = new Date(year, month, day);
                  const dateKey = formatDateForAPI(cellDate);
                  const dayEvents = getEventsForDate(dateKey);
                  const isToday = formatDateForAPI(new Date()) === dateKey;
                  const isSelected = selectedDate && formatDateForAPI(selectedDate) === dateKey;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(cellDate)}
                      className={cn(
                        'min-h-[88px] sm:min-h-[104px] rounded-xl border p-2 text-left transition-colors flex flex-col',
                        isSelected
                          ? 'bg-navy-600 border-navy-700'
                          : isToday
                            ? 'bg-navy-50 border-navy-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      <span className={cn('text-sm font-semibold', isSelected ? 'text-white' : 'text-navy-800')}>
                        {day}
                      </span>
                      <div className="mt-2 space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              'text-[10px] sm:text-[11px] truncate px-1.5 py-0.5 rounded',
                              'text-white',
                            )}
                            style={{ backgroundColor: eventColor(event) }}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className={cn('text-[10px]', isSelected ? 'text-white' : 'text-slate-500')}>
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {weekDates.map((date) => {
                const dateKey = formatDateForAPI(date);
                const dayEvents = getEventsForDate(dateKey);
                const isSelected = selectedDate && formatDateForAPI(selectedDate) === dateKey;
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'rounded-xl border p-3 text-left min-h-[130px] transition-colors',
                      isSelected ? 'bg-navy-50 border-navy-300' : 'bg-white border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <p className="text-xs text-slate-500">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                    <p className="font-semibold text-navy-800 mb-2">{date.getDate()}</p>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 4).map((event) => (
                        <div key={event.id} className="flex items-center gap-1.5 text-[11px] text-slate-700 truncate">
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: eventColor(event) }}
                          />
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length === 0 && (
                        <p className="text-[11px] text-slate-400">No events</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-navy-800">
                {(selectedDate ?? new Date()).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-navy-800">{event.title}</p>
                        {event.description && <p className="text-sm text-slate-600 mt-1">{event.description}</p>}
                      </div>
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full text-white"
                        style={{ backgroundColor: eventColor(event) }}
                      >
                        {eventTypeLabels[event.event_type]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{eventTimeLabel(event)}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 py-4 text-center">No events for this day</p>
              )}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {selectedDate && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="font-display font-semibold text-navy-800 mb-4">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div className="space-y-3">
                {selectedDateEvents.length > 0 ? (
                  selectedDateEvents.map((event) => (
                    <div key={event.id} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                      <div
                        className="w-1 rounded-full"
                        style={{ backgroundColor: eventColor(event) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-navy-800 truncate">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{eventTimeLabel(event)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No events for this date</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="font-display font-semibold text-navy-800 mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div
                      className="w-1 rounded-full"
                      style={{ backgroundColor: eventColor(event) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-navy-800 truncate">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {eventTimeLabel(event)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No upcoming events</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-6">
            <h4 className="font-medium text-navy-800 mb-3">Event Categories</h4>
            <div className="space-y-2">
              {Object.entries(eventTypeLabels).map(([type, label]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventTypeColors[type as EventType] }} />
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="font-display text-xl font-semibold text-navy-800">Add Event</h3>
              <button
                onClick={() => setIsAddEventOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form
              className="p-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setFormError('');
                createEventMutation.mutate();
              }}
            >
              <div>
                <label className="text-sm font-medium text-slate-700">Title</label>
                <input
                  value={eventForm.title}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
                  placeholder="Enter event title"
                  style={{ colorScheme: 'light' }}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="mt-1 h-24 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500"
                  placeholder="Optional event notes"
                  style={{ colorScheme: 'light' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Category</label>
                <div className="relative mt-1">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={eventForm.eventType}
                    onChange={(event) => setEventForm((prev) => ({ ...prev, eventType: event.target.value as EventType }))}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-500"
                    style={{ colorScheme: 'light' }}
                  >
                    {creatableEventTypes.map((value) => (
                      <option key={value} value={value}>
                        {eventTypeLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={eventForm.allDay}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, allDay: event.target.checked }))}
                  className="rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                />
                All day event
              </label>

              <DateTimePickerTrigger
                label={eventForm.allDay ? 'Start Date' : 'Start Date & Time'}
                value={eventForm.startAt}
                onChange={(newDate) => setEventForm((prev) => ({ ...prev, startAt: newDate }))}
              />

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={eventForm.hasEnd}
                  onChange={(event) => setEventForm((prev) => ({ ...prev, hasEnd: event.target.checked }))}
                  className="rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                />
                Set end date/time
              </label>

              {eventForm.hasEnd && (
                <DateTimePickerTrigger
                  label={eventForm.allDay ? 'End Date' : 'End Date & Time'}
                  value={eventForm.endAt}
                  onChange={(newDate) => setEventForm((prev) => ({ ...prev, endAt: newDate }))}
                />
              )}

              {formError && <p className="text-sm text-red-500">{formError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-600 text-white text-sm font-medium hover:bg-navy-700 transition-colors disabled:opacity-60"
                >
                  {createEventMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="w-4 h-4" />
                      Save Event
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

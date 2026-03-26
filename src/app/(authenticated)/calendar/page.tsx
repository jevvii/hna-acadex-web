'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calendarApi } from '@/lib/api';
import { CalendarEvent } from '@/lib/types';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const eventTypeColors: Record<string, string> = {
  deadline: '#F59E0B',
  exam: '#EF4444',
  personal: '#3B82F6',
  holiday: '#10B981',
  school_event: '#8B5CF6',
};

const eventTypeLabels: Record<string, string> = {
  deadline: 'Deadline',
  exam: 'Exam',
  personal: 'Personal',
  holiday: 'Holiday',
  school_event: 'School Event',
};

function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Calculate date range for API query
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: () => calendarApi.getEvents(
      formatDateForAPI(startOfMonth),
      formatDateForAPI(endOfMonth)
    ),
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to safely extract events array from potential paginated response
  const getEventList = (): CalendarEvent[] => {
    if (!events) return [];
    if (Array.isArray(events)) return events;
    // Handle paginated response { results: [...] }
    const paginated = events as unknown as { results?: CalendarEvent[] };
    return paginated?.results ?? [];
  };

  const getEventsForDate = (date: string): CalendarEvent[] => {
    return getEventList().filter((event: CalendarEvent) => {
      const eventDate = new Date(event.start_at).toISOString().split('T')[0];
      return eventDate === date;
    });
  };

  // Get upcoming events (today and future)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return getEventList()
      .filter((event: CalendarEvent) => new Date(event.start_at) >= today)
      .sort((a: CalendarEvent, b: CalendarEvent) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      )
      .slice(0, 10);
  }, [events]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = formatDateForAPI(selectedDate);
    return getEventList().filter((event: CalendarEvent) => {
      const eventDate = new Date(event.start_at).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  }, [selectedDate, events]);

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
    <div className="p-8 h-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-display text-3xl font-bold text-navy-800">Calendar</h1>
        <p className="text-gray-500 mt-1">View your schedule and upcoming events</p>
      </motion.div>

      <div className="flex gap-6">
        {/* Main Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 bg-white rounded-2xl shadow-card p-6"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-navy-800">
              {monthNames[month]} {year}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {days.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = getEventsForDate(dateStr);
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              const isSelected = selectedDate?.toDateString() === new Date(year, month, day).toDateString();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(new Date(year, month, day))}
                  className={cn(
                    'aspect-square rounded-xl p-2 flex flex-col items-start transition-all',
                    isSelected
                      ? 'bg-navy-600 text-white'
                      : isToday
                      ? 'bg-navy-50 border-2 border-navy-600'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <span className={cn(
                    'font-semibold',
                    isSelected ? 'text-white' : 'text-navy-800'
                  )}>
                    {day}
                  </span>
                  <div className="flex gap-1 mt-auto flex-wrap">
                    {dayEvents.slice(0, 3).map((event: CalendarEvent, idx: number) => (
                      <div
                        key={idx}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: eventTypeColors[event.event_type] || '#94A3B8' }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className={cn(
                        'text-[8px]',
                        isSelected ? 'text-white' : 'text-gray-500'
                      )}>
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 space-y-6"
        >
          {/* Selected Date Events */}
          {selectedDate && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h3 className="font-display font-semibold text-navy-800 mb-4">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div className="space-y-3">
                {selectedDateEvents.length > 0 ? (
                  selectedDateEvents.map((event: CalendarEvent) => (
                    <div
                      key={event.id}
                      className="flex gap-3 p-3 rounded-xl bg-gray-50"
                    >
                      <div
                        className="w-1 rounded-full"
                        style={{ backgroundColor: eventTypeColors[event.event_type] || '#94A3B8' }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-navy-800">{event.title}</p>
                        <p className="text-sm text-gray-500">{event.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {event.all_day ? 'All day' : new Date(event.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No events for this date</p>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h3 className="font-display font-semibold text-navy-800 mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event: CalendarEvent) => (
                  <div
                    key={event.id}
                    className="flex gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div
                      className="w-1 rounded-full"
                      style={{ backgroundColor: eventTypeColors[event.event_type] || '#94A3B8' }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-navy-800">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No upcoming events</p>
              )}
            </div>
          </div>

          {/* Event Types Legend */}
          <div className="bg-white rounded-2xl shadow-card p-6">
            <h4 className="font-medium text-navy-800 mb-3">Event Types</h4>
            <div className="space-y-2">
              {Object.entries(eventTypeLabels).map(([type, label]) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: eventTypeColors[type] }}
                  />
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

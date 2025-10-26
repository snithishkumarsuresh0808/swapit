'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

export default function Calendar() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get month and year
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get first day of the month
  const firstDay = new Date(year, month, 1).getDay();

  // Get number of days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get number of days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Generate calendar days
  const calendarDays = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month days
  const today = new Date();
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday =
      i === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      isToday: isToday,
    });
  }

  // Next month days
  const remainingDays = 42 - calendarDays.length; // 6 rows * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Navigate to previous month
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-3 py-4">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-bold text-gray-900">Calendar</h1>
            <button
              onClick={goToToday}
              className="px-2 py-1 text-[10px] font-semibold text-green-600 hover:bg-green-50 rounded transition-all"
            >
              Today
            </button>
          </div>

          {/* Calendar Card */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Calendar Header */}
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <button
                onClick={previousMonth}
                className="p-1 hover:bg-gray-100 rounded-full transition-all"
                title="Previous month"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <h2 className="text-xs font-bold text-gray-900">
                {monthNames[month]} {year}
              </h2>

              <button
                onClick={nextMonth}
                className="p-1 hover:bg-gray-100 rounded-full transition-all"
                title="Next month"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-2">
              {/* Day names header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-[9px] font-semibold text-gray-600 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dateObj, index) => (
                  <div
                    key={index}
                    className={`
                      aspect-square flex items-center justify-center rounded text-[10px]
                      ${dateObj.isCurrentMonth
                        ? 'text-gray-900 hover:bg-gray-100 cursor-pointer'
                        : 'text-gray-400'
                      }
                      ${dateObj.isToday
                        ? 'bg-green-600 text-white font-bold hover:bg-green-700'
                        : ''
                      }
                      transition-colors
                    `}
                  >
                    {dateObj.day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-600">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center text-white font-bold text-[9px]">
                {today.getDate()}
              </div>
              <span>Today</span>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <div className="flex gap-1.5">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-[10px] font-semibold text-blue-900 mb-0.5">Schedule Your Learning Sessions</p>
                <p className="text-[9px] text-blue-700">
                  Use this calendar to track your skill swap sessions and availability.
                  Click on any date to add or view scheduled sessions with your learning partners.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

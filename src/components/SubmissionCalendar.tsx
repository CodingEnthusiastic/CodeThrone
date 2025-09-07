import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

interface SubmissionCalendarProps {
  submissions: Array<{
    date: string;
    status: string;
  }>;
}

const SubmissionCalendar: React.FC<SubmissionCalendarProps> = ({ submissions }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Utility function to convert any date to IST date string
  const toISTDateString = (date: Date) => {
    const istOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
    const istDate = new Date(date.getTime() + (istOffset * 60 * 1000));
    return istDate.toISOString().split('T')[0];
  };

  // Group submissions by date (convert to Indian timezone IST)
  const submissionsByDate = submissions.reduce((acc, submission) => {
    const date = new Date(submission.date);
    const localDate = toISTDateString(date);
    if (!acc[localDate]) {
      acc[localDate] = [];
    }
    acc[localDate].push(submission);
    return acc;
  }, {} as Record<string, Array<{ date: string; status: string }>>);
  
  // Get submission intensity (0-4) for color coding like GitHub
  const getSubmissionIntensity = (date: string) => {
    const daySubmissions = submissionsByDate[date] || [];
    if (daySubmissions.length === 0) return 0;
    if (daySubmissions.length <= 1) return 1;
    if (daySubmissions.length <= 3) return 2;
    if (daySubmissions.length <= 5) return 3;
    return 4;
  };
  
  // Get color class based on intensity (GitHub style)
  const getIntensityColor = (intensity: number) => {
    switch (intensity) {
      case 0: return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      case 1: return 'bg-green-300 dark:bg-green-400/30 border-green-400 dark:border-green-400/50';
      case 2: return 'bg-green-400 dark:bg-green-300/40 border-green-500 dark:border-green-300/70';
      case 3: return 'bg-green-500 dark:bg-green-300/50 border-green-600 dark:border-green-300/90';
      case 4: return 'bg-green-600 dark:bg-green-200/60 border-green-700 dark:border-green-200/100';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  // Generate year data (GitHub-style contribution graph)
  const yearData = useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1); // Start of year
    const endDate = new Date(selectedYear + 1, 0, 0); // End of year
    const weeks = [];
    
    // Start from the Sunday before the year begins
    const firstSunday = new Date(startDate);
    firstSunday.setDate(startDate.getDate() - startDate.getDay());
    
    let currentDate = new Date(firstSunday);
    
    while (currentDate <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        // Use IST date string to match the submission grouping
        const dateStr = toISTDateString(currentDate);
        const intensity = getSubmissionIntensity(dateStr);
        const daySubmissions = submissionsByDate[dateStr] || [];
        
        week.push({
          date: new Date(currentDate),
          dateStr,
          intensity,
          submissions: daySubmissions,
          isCurrentYear: currentDate.getFullYear() === selectedYear
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }
    
    return weeks;
  }, [selectedYear, submissionsByDate]);

  // Calculate stats
  const stats = useMemo(() => {
    const yearSubmissions = submissions.filter(s => {
      const date = new Date(s.date);
      const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
      return istDate.getFullYear() === selectedYear;
    });
    
    const activeDays = new Set(
      yearSubmissions.map(s => toISTDateString(new Date(s.date)))
    ).size;
    
    const maxStreak = () => {
      const dates = Array.from(new Set(
        yearSubmissions.map(s => toISTDateString(new Date(s.date)))
      )).sort();
      
      let maxStreak = 0;
      let currentStreak = 0;
      let lastDate = null;
      
      for (const dateStr of dates) {
        const date = new Date(dateStr + 'T00:00:00.000Z'); // Parse as UTC to avoid timezone shift
        if (lastDate) {
          const daysDiff = (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff === 1) {
            currentStreak++;
          } else {
            maxStreak = Math.max(maxStreak, currentStreak);
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
        lastDate = date;
      }
      return Math.max(maxStreak, currentStreak);
    };
    
    return {
      totalSubmissions: yearSubmissions.length,
      activeDays,
      maxStreak: maxStreak()
    };
  }, [submissions, selectedYear]);

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const availableYears = useMemo(() => {
    const years = new Set(submissions.map(s => {
      const date = new Date(s.date);
      const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
      return istDate.getFullYear();
    }));
    return Array.from(years).sort((a, b) => b - a);
  }, [submissions]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            <span className="text-2xl font-bold">{stats.totalSubmissions}</span> submissions in the past one year
          </h3>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Total active days: <strong className="text-gray-900 dark:text-gray-100">{stats.activeDays}</strong></span>
          <span>Max streak: <strong className="text-gray-900 dark:text-gray-100">{stats.maxStreak}</strong></span>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none bg-transparent border border-gray-300 dark:border-gray-600 rounded px-3 py-1 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
            >
              {availableYears.map(year => (
                <option key={year} value={year} className="bg-white dark:bg-gray-800">
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-2">
            <div className="w-8"></div> {/* Space for day labels */}
            {monthLabels.map((month) => (
              <div key={month} className="flex-1 min-w-[40px] text-xs text-gray-500 dark:text-gray-400 text-center">
                {month}
              </div>
            ))}
          </div>
          
          {/* Day labels and contribution grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col space-y-1 mr-2">
              {dayLabels.map((day, index) => (
                <div key={day} className={`h-3 text-xs text-gray-500 dark:text-gray-400 flex items-center ${index % 2 === 0 ? '' : 'opacity-0'}`}>
                  {index % 2 === 0 ? day.slice(0, 3) : ''}
                </div>
              ))}
            </div>
            
            {/* Contribution grid */}
            <div className="flex space-x-1 flex-1">
              {yearData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col space-y-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-3 h-3 rounded-sm border ${getIntensityColor(day.intensity)} ${
                        !day.isCurrentYear ? 'opacity-30' : ''
                      } hover:scale-110 transition-transform cursor-pointer`}
                      title={`${day.date.toDateString()}: ${day.submissions.length} submissions`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-end mt-4 space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Less</span>
            <div className="flex space-x-1">
              {[0, 1, 2, 3, 4].map((intensity) => (
                <div
                  key={intensity}
                  className={`w-3 h-3 rounded-sm ${getIntensityColor(intensity)}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">More</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionCalendar;

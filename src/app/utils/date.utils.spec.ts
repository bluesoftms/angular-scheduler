import {
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  isSameDay,
  formatTime,
  getHourPosition,
  getDurationInHours,
  getTimeFromMousePosition
} from './date.utils';

describe('DateUtils', () => {
  describe('getStartOfDay', () => {
    it('should return start of day', () => {
      const date = new Date(2024, 0, 15, 14, 30, 45, 123);
      const startOfDay = getStartOfDay(date);
      
      expect(startOfDay.getFullYear()).toBe(2024);
      expect(startOfDay.getMonth()).toBe(0);
      expect(startOfDay.getDate()).toBe(15);
      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(startOfDay.getSeconds()).toBe(0);
      expect(startOfDay.getMilliseconds()).toBe(0);
    });

    it('should not modify original date', () => {
      const date = new Date(2024, 0, 15, 14, 30);
      const originalTime = date.getTime();
      getStartOfDay(date);
      
      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day', () => {
      const date = new Date(2024, 0, 15, 14, 30);
      const endOfDay = getEndOfDay(date);
      
      expect(endOfDay.getFullYear()).toBe(2024);
      expect(endOfDay.getMonth()).toBe(0);
      expect(endOfDay.getDate()).toBe(15);
      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);
      expect(endOfDay.getMilliseconds()).toBe(999);
    });

    it('should not modify original date', () => {
      const date = new Date(2024, 0, 15, 14, 30);
      const originalTime = date.getTime();
      getEndOfDay(date);
      
      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('getStartOfWeek', () => {
    it('should return Sunday for week start', () => {
      const wednesday = new Date(2024, 0, 17); // Wednesday
      const startOfWeek = getStartOfWeek(wednesday);
      
      expect(startOfWeek.getDay()).toBe(0); // Sunday
      expect(startOfWeek.getDate()).toBe(14);
      expect(startOfWeek.getHours()).toBe(0);
      expect(startOfWeek.getMinutes()).toBe(0);
      expect(startOfWeek.getSeconds()).toBe(0);
      expect(startOfWeek.getMilliseconds()).toBe(0);
    });

    it('should handle Sunday correctly', () => {
      const sunday = new Date(2024, 0, 14); // Sunday
      const startOfWeek = getStartOfWeek(sunday);
      
      expect(startOfWeek.getDate()).toBe(14);
      expect(startOfWeek.getDay()).toBe(0);
    });

    it('should handle Saturday correctly', () => {
      const saturday = new Date(2024, 0, 20); // Saturday
      const startOfWeek = getStartOfWeek(saturday);
      
      expect(startOfWeek.getDate()).toBe(14);
      expect(startOfWeek.getDay()).toBe(0);
    });
  });

  describe('getEndOfWeek', () => {
    it('should return Saturday for week end', () => {
      const wednesday = new Date(2024, 0, 17); // Wednesday
      const endOfWeek = getEndOfWeek(wednesday);
      
      expect(endOfWeek.getDay()).toBe(6); // Saturday
      expect(endOfWeek.getDate()).toBe(20);
      expect(endOfWeek.getHours()).toBe(23);
      expect(endOfWeek.getMinutes()).toBe(59);
      expect(endOfWeek.getSeconds()).toBe(59);
      expect(endOfWeek.getMilliseconds()).toBe(999);
    });

    it('should handle Sunday correctly', () => {
      const sunday = new Date(2024, 0, 14); // Sunday
      const endOfWeek = getEndOfWeek(sunday);
      
      expect(endOfWeek.getDate()).toBe(20);
      expect(endOfWeek.getDay()).toBe(6);
    });

    it('should handle Saturday correctly', () => {
      const saturday = new Date(2024, 0, 20); // Saturday
      const endOfWeek = getEndOfWeek(saturday);
      
      expect(endOfWeek.getDate()).toBe(20);
      expect(endOfWeek.getDay()).toBe(6);
    });
  });

  describe('getStartOfMonth', () => {
    it('should return first day of month', () => {
      const date = new Date(2024, 1, 15, 14, 30);
      const startOfMonth = getStartOfMonth(date);
      
      expect(startOfMonth.getFullYear()).toBe(2024);
      expect(startOfMonth.getMonth()).toBe(1);
      expect(startOfMonth.getDate()).toBe(1);
      expect(startOfMonth.getHours()).toBe(0);
      expect(startOfMonth.getMinutes()).toBe(0);
      expect(startOfMonth.getSeconds()).toBe(0);
    });

    it('should handle December correctly', () => {
      const date = new Date(2024, 11, 25);
      const startOfMonth = getStartOfMonth(date);
      
      expect(startOfMonth.getMonth()).toBe(11);
      expect(startOfMonth.getDate()).toBe(1);
    });
  });

  describe('getEndOfMonth', () => {
    it('should return last day of month', () => {
      const date = new Date(2024, 1, 15);
      const endOfMonth = getEndOfMonth(date);
      
      expect(endOfMonth.getFullYear()).toBe(2024);
      expect(endOfMonth.getMonth()).toBe(1);
      expect(endOfMonth.getDate()).toBe(29); // 2024 is leap year
      expect(endOfMonth.getHours()).toBe(23);
      expect(endOfMonth.getMinutes()).toBe(59);
      expect(endOfMonth.getSeconds()).toBe(59);
      expect(endOfMonth.getMilliseconds()).toBe(999);
    });

    it('should handle months with different days correctly', () => {
      // January (31 days)
      expect(getEndOfMonth(new Date(2024, 0, 15)).getDate()).toBe(31);
      
      // April (30 days)
      expect(getEndOfMonth(new Date(2024, 3, 15)).getDate()).toBe(30);
      
      // February non-leap year
      expect(getEndOfMonth(new Date(2023, 1, 15)).getDate()).toBe(28);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date(2024, 0, 15, 10, 30);
      const date2 = new Date(2024, 0, 15, 20, 45);
      
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date(2024, 0, 15);
      const date2 = new Date(2024, 0, 16);
      
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different months', () => {
      const date1 = new Date(2024, 0, 15);
      const date2 = new Date(2024, 1, 15);
      
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should return false for different years', () => {
      const date1 = new Date(2024, 0, 15);
      const date2 = new Date(2025, 0, 15);
      
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('should handle edge cases', () => {
      const date1 = new Date(2024, 0, 1, 0, 0, 0);
      const date2 = new Date(2024, 0, 1, 23, 59, 59);
      
      expect(isSameDay(date1, date2)).toBe(true);
    });
  });

  describe('formatTime', () => {
    it('should format morning time correctly', () => {
      const date = new Date(2024, 0, 1, 9, 30);
      const formatted = formatTime(date);
      
      expect(formatted).toContain('9:30');
      expect(formatted.toLowerCase()).toContain('am');
    });

    it('should format afternoon time correctly', () => {
      const date = new Date(2024, 0, 1, 14, 45);
      const formatted = formatTime(date);
      
      expect(formatted).toContain('2:45');
      expect(formatted.toLowerCase()).toContain('pm');
    });

    it('should format midnight correctly', () => {
      const date = new Date(2024, 0, 1, 0, 0);
      const formatted = formatTime(date);
      
      expect(formatted).toContain('12:00');
      expect(formatted.toLowerCase()).toContain('am');
    });

    it('should format noon correctly', () => {
      const date = new Date(2024, 0, 1, 12, 0);
      const formatted = formatTime(date);
      
      expect(formatted).toContain('12:00');
      expect(formatted.toLowerCase()).toContain('pm');
    });

    it('should pad minutes with zero', () => {
      const date = new Date(2024, 0, 1, 9, 5);
      const formatted = formatTime(date);
      
      expect(formatted).toContain('9:05');
    });
  });

  describe('getHourPosition', () => {
    it('should calculate hour position for exact hours', () => {
      expect(getHourPosition(new Date(2024, 0, 1, 0, 0))).toBe(0);
      expect(getHourPosition(new Date(2024, 0, 1, 12, 0))).toBe(12);
      expect(getHourPosition(new Date(2024, 0, 1, 23, 0))).toBe(23);
    });

    it('should calculate fractional positions for minutes', () => {
      expect(getHourPosition(new Date(2024, 0, 1, 10, 30))).toBe(10.5);
      expect(getHourPosition(new Date(2024, 0, 1, 10, 15))).toBe(10.25);
      expect(getHourPosition(new Date(2024, 0, 1, 10, 45))).toBe(10.75);
    });

    it('should handle edge cases', () => {
      expect(getHourPosition(new Date(2024, 0, 1, 23, 59))).toBeCloseTo(23.983, 2);
      expect(getHourPosition(new Date(2024, 0, 1, 0, 1))).toBeCloseTo(0.0167, 3);
    });
  });

  describe('getDurationInHours', () => {
    it('should calculate duration for whole hours', () => {
      const start = new Date(2024, 0, 1, 10, 0);
      const end = new Date(2024, 0, 1, 12, 0);
      
      expect(getDurationInHours(start, end)).toBe(2);
    });

    it('should calculate duration for fractional hours', () => {
      const start = new Date(2024, 0, 1, 10, 0);
      const end = new Date(2024, 0, 1, 11, 30);
      
      expect(getDurationInHours(start, end)).toBe(1.5);
    });

    it('should handle minutes correctly', () => {
      const start = new Date(2024, 0, 1, 10, 15);
      const end = new Date(2024, 0, 1, 10, 45);
      
      expect(getDurationInHours(start, end)).toBe(0.5);
    });

    it('should handle cross-day durations', () => {
      const start = new Date(2024, 0, 1, 22, 0);
      const end = new Date(2024, 0, 2, 2, 0);
      
      expect(getDurationInHours(start, end)).toBe(4);
    });

    it('should return negative for reverse times', () => {
      const start = new Date(2024, 0, 1, 12, 0);
      const end = new Date(2024, 0, 1, 10, 0);
      
      expect(getDurationInHours(start, end)).toBe(-2);
    });
  });

  describe('getTimeFromMousePosition', () => {
    it('should calculate time for top of hour slot', () => {
      const result = getTimeFromMousePosition(10, 0, 60);
      
      expect(result.hour).toBe(10);
      expect(result.minutes).toBe(0);
    });

    it('should calculate time for middle of hour slot', () => {
      const result = getTimeFromMousePosition(10, 30, 60);
      
      expect(result.hour).toBe(10);
      expect(result.minutes).toBe(30);
    });

    it('should round to nearest 15 minutes', () => {
      // 7 minutes should round to 0
      let result = getTimeFromMousePosition(10, 7, 60);
      expect(result.minutes).toBe(0);
      
      // 8 minutes should round to 15
      result = getTimeFromMousePosition(10, 8, 60);
      expect(result.minutes).toBe(15);
      
      // 22 minutes should round to 15
      result = getTimeFromMousePosition(10, 22, 60);
      expect(result.minutes).toBe(15);
      
      // 23 minutes should round to 30
      result = getTimeFromMousePosition(10, 23, 60);
      expect(result.minutes).toBe(30);
    });

    it('should handle edge case at end of hour', () => {
      const result = getTimeFromMousePosition(10, 59, 60);
      
      expect(result.hour).toBe(11);
      expect(result.minutes).toBe(0);
    });

    it('should work with different slot heights', () => {
      // With 120px slot height
      let result = getTimeFromMousePosition(10, 60, 120);
      expect(result.hour).toBe(10);
      expect(result.minutes).toBe(30);
      
      // With 80px slot height
      result = getTimeFromMousePosition(10, 40, 80);
      expect(result.hour).toBe(10);
      expect(result.minutes).toBe(30);
    });

    it('should handle fractional pixel positions', () => {
      const result = getTimeFromMousePosition(10, 37.5, 60);
      
      // 37.5/60 * 60 = 37.5 minutes, rounds to nearest 15 = 30
      expect(result.minutes).toBe(30);
    });
  });
});
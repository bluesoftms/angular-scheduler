import { CalendarEvent } from '../models/calendar-event.model';
import { 
  calculateEventPositions, 
  groupOverlappingEvents, 
  calculateEventPositionsWithPreview,
  EventPosition 
} from './overlap.utils';

describe('OverlapUtils', () => {
  describe('calculateEventPositions', () => {
    it('should return empty array for no events', () => {
      const positions = calculateEventPositions([]);
      expect(positions).toEqual([]);
    });

    it('should handle single event', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 11, 0),
          allDay: false
        }
      ];

      const positions = calculateEventPositions(events);
      
      expect(positions.length).toBe(1);
      expect(positions[0].left).toBe(0);
      expect(positions[0].width).toBe(100);
      expect(positions[0].column).toBe(0);
      expect(positions[0].totalColumns).toBe(1);
    });

    it('should handle non-overlapping events', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 9, 0),
          end: new Date(2024, 0, 1, 10, 0),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 1, 11, 0),
          end: new Date(2024, 0, 1, 12, 0),
          allDay: false
        }
      ];

      const positions = calculateEventPositions(events);
      
      expect(positions.length).toBe(2);
      // Non-overlapping events should each take full width
      positions.forEach(pos => {
        expect(pos.width).toBe(100);
        expect(pos.left).toBe(0);
      });
    });

    it('should handle two overlapping events', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 11, 30),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 1, 10, 30),
          end: new Date(2024, 0, 1, 12, 0),
          allDay: false
        }
      ];

      const positions = calculateEventPositions(events);
      
      expect(positions.length).toBe(2);
      
      const event1Pos = positions.find(p => p.event.uuid === 'event1');
      const event2Pos = positions.find(p => p.event.uuid === 'event2');
      
      expect(event1Pos?.column).toBe(0);
      expect(event1Pos?.width).toBe(50);
      expect(event1Pos?.left).toBe(0);
      
      expect(event2Pos?.column).toBe(1);
      expect(event2Pos?.width).toBe(50);
      expect(event2Pos?.left).toBe(50);
    });

    it('should handle multiple overlapping events', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 12, 0),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 1, 10, 30),
          end: new Date(2024, 0, 1, 11, 30),
          allDay: false
        },
        {
          uuid: 'event3',
          title: 'Event 3',
          start: new Date(2024, 0, 1, 11, 0),
          end: new Date(2024, 0, 1, 12, 30),
          allDay: false
        }
      ];

      const positions = calculateEventPositions(events);
      
      expect(positions.length).toBe(3);
      
      // All events should have equal width when they all overlap
      const totalColumns = positions[0].totalColumns;
      expect(totalColumns).toBe(3);
      
      // Check that columns are assigned properly
      const columns = positions.map(p => p.column).sort();
      expect(columns).toEqual([0, 1, 2]);
    });

    it('should handle events that can span multiple columns', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 9, 0),
          end: new Date(2024, 0, 1, 10, 0),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 1, 10, 30),
          end: new Date(2024, 0, 1, 11, 30),
          allDay: false
        },
        {
          uuid: 'event3',
          title: 'Event 3',
          start: new Date(2024, 0, 1, 10, 30),
          end: new Date(2024, 0, 1, 11, 30),
          allDay: false
        }
      ];

      const positions = calculateEventPositions(events);
      
      // event1 should be able to span wider since it doesn't overlap with event2 and event3
      const event1Pos = positions.find(p => p.event.uuid === 'event1');
      expect(event1Pos?.width).toBeGreaterThan(33.33);
    });

    it('should sort events by start time then duration', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'short',
          title: 'Short Event',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 10, 30),
          allDay: false
        },
        {
          uuid: 'long',
          title: 'Long Event',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 12, 0),
          allDay: false
        }
      ];

      const positions = calculateEventPositions(events);
      
      // Longer event should be positioned first (column 0)
      const longEventPos = positions.find(p => p.event.uuid === 'long');
      expect(longEventPos?.column).toBe(0);
    });
  });

  describe('groupOverlappingEvents', () => {
    it('should return empty array for no events', () => {
      const groups = groupOverlappingEvents([]);
      expect(groups).toEqual([]);
    });

    it('should create separate groups for non-overlapping events', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 9, 0),
          end: new Date(2024, 0, 1, 10, 0),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 1, 11, 0),
          end: new Date(2024, 0, 1, 12, 0),
          allDay: false
        }
      ];

      const groups = groupOverlappingEvents(events);
      
      expect(groups.length).toBe(2);
      expect(groups[0].length).toBe(1);
      expect(groups[1].length).toBe(1);
    });

    it('should group overlapping events together', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 11, 30),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 1, 10, 30),
          end: new Date(2024, 0, 1, 12, 0),
          allDay: false
        }
      ];

      const groups = groupOverlappingEvents(events);
      
      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(2);
    });

    it('should merge groups when event overlaps multiple groups', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 9, 0),
          end: new Date(2024, 0, 1, 10, 0),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 1, 11, 0),
          end: new Date(2024, 0, 1, 12, 0),
          allDay: false
        },
        {
          uuid: 'event3',
          title: 'Bridge Event',
          start: new Date(2024, 0, 1, 9, 30),
          end: new Date(2024, 0, 1, 11, 30),
          allDay: false
        }
      ];

      const groups = groupOverlappingEvents(events);
      
      // All events should be in one group because event3 bridges event1 and event2
      expect(groups.length).toBe(1);
      expect(groups[0].length).toBe(3);
    });

    it('should handle complex overlapping scenarios', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 8, 0),
          end: new Date(2024, 0, 1, 9, 0),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 1, 8, 30),
          end: new Date(2024, 0, 1, 9, 30),
          allDay: false
        },
        {
          uuid: 'event3',
          title: 'Event 3',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 11, 0),
          allDay: false
        },
        {
          uuid: 'event4',
          title: 'Event 4',
          start: new Date(2024, 0, 1, 10, 30),
          end: new Date(2024, 0, 1, 11, 30),
          allDay: false
        }
      ];

      const groups = groupOverlappingEvents(events);
      
      // Should have 2 groups: (event1, event2) and (event3, event4)
      expect(groups.length).toBe(2);
      expect(groups[0].length).toBe(2);
      expect(groups[1].length).toBe(2);
    });
  });

  describe('calculateEventPositionsWithPreview', () => {
    it('should return normal positions when preview is null', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 11, 0),
          allDay: false
        }
      ];

      const positions = calculateEventPositionsWithPreview(events, null);
      
      expect(positions.length).toBe(1);
      expect(positions[0].event.uuid).toBe('event1');
    });

    it('should adjust positions for preview event', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 11, 0),
          allDay: false
        }
      ];

      const preview = {
        start: new Date(2024, 0, 1, 10, 30),
        end: new Date(2024, 0, 1, 11, 30)
      };

      const positions = calculateEventPositionsWithPreview(events, preview);
      
      // Original event should be adjusted for preview
      expect(positions.length).toBe(1);
      const event1Pos = positions[0];
      
      // Event should be in narrower column due to preview
      expect(event1Pos.width).toBeLessThan(100);
    });

    it('should not include preview event in final positions', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 11, 0),
          allDay: false
        }
      ];

      const preview = {
        start: new Date(2024, 0, 1, 11, 30),
        end: new Date(2024, 0, 1, 12, 30)
      };

      const positions = calculateEventPositionsWithPreview(events, preview);
      
      expect(positions.length).toBe(1);
      expect(positions.every(p => p.event.uuid !== '__preview__')).toBeTruthy();
    });

    it('should handle preview overlapping multiple events', () => {
      const events: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 1, 10, 0),
          end: new Date(2024, 0, 1, 11, 0),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 1, 11, 0),
          end: new Date(2024, 0, 1, 12, 0),
          allDay: false
        }
      ];

      const preview = {
        start: new Date(2024, 0, 1, 10, 30),
        end: new Date(2024, 0, 1, 11, 30)
      };

      const positions = calculateEventPositionsWithPreview(events, preview);
      
      expect(positions.length).toBe(2);
      
      // Both events should be affected by the preview
      const totalColumns = Math.max(...positions.map(p => p.totalColumns));
      expect(totalColumns).toBeGreaterThan(1);
    });
  });
});
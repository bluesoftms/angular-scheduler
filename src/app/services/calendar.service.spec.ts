import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CalendarService } from './calendar.service';
import { CalendarEvent, ViewType } from '../models/calendar-event.model';
import { firstValueFrom } from 'rxjs';

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalendarService);
    // Let the initial effect run
    tick(300);
  }));

  afterEach(() => {
    // Clean up to prevent effects from running after tests
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should initialize with current date', () => {
      const today = new Date();
      const serviceDate = service.currentDate$();
      expect(serviceDate.toDateString()).toBe(today.toDateString());
    });

    it('should initialize with week view', () => {
      expect(service.viewType$()).toBe('week');
    });

    it('should initialize and load events', () => {
      // Events are already loaded in beforeEach
      expect(service.events$().length).toBeGreaterThan(0); // Service generates dummy events
    });
  });

  describe('Date Navigation', () => {
    it('should navigate to previous day in day view', () => {
      service.setViewType('day');
      const initialDate = new Date(2024, 0, 15);
      service.setCurrentDate(initialDate);
      
      service.navigatePrevious();
      
      const newDate = service.currentDate$();
      expect(newDate.getDate()).toBe(14);
    });

    it('should navigate to next day in day view', () => {
      service.setViewType('day');
      const initialDate = new Date(2024, 0, 15);
      service.setCurrentDate(initialDate);
      
      service.navigateNext();
      
      const newDate = service.currentDate$();
      expect(newDate.getDate()).toBe(16);
    });

    it('should navigate to previous week in week view', () => {
      service.setViewType('week');
      const initialDate = new Date(2024, 0, 15);
      service.setCurrentDate(initialDate);
      
      service.navigatePrevious();
      
      const newDate = service.currentDate$();
      expect(newDate.getDate()).toBe(8);
    });

    it('should navigate to next week in week view', () => {
      service.setViewType('week');
      const initialDate = new Date(2024, 0, 15);
      service.setCurrentDate(initialDate);
      
      service.navigateNext();
      
      const newDate = service.currentDate$();
      expect(newDate.getDate()).toBe(22);
    });

    it('should navigate to previous month in month view', () => {
      service.setViewType('month');
      const initialDate = new Date(2024, 1, 15);
      service.setCurrentDate(initialDate);
      
      service.navigatePrevious();
      
      const newDate = service.currentDate$();
      expect(newDate.getMonth()).toBe(0);
    });

    it('should navigate to next month in month view', () => {
      service.setViewType('month');
      const initialDate = new Date(2024, 0, 15);
      service.setCurrentDate(initialDate);
      
      service.navigateNext();
      
      const newDate = service.currentDate$();
      expect(newDate.getMonth()).toBe(1);
    });

    it('should navigate to today', () => {
      const pastDate = new Date(2023, 0, 1);
      service.setCurrentDate(pastDate);
      
      service.navigateToday();
      
      const today = new Date();
      const currentDate = service.currentDate$();
      expect(currentDate.toDateString()).toBe(today.toDateString());
    });
  });

  describe('View Type', () => {
    it('should change view type to day', () => {
      service.setViewType('day');
      expect(service.viewType$()).toBe('day');
    });

    it('should change view type to week', () => {
      service.setViewType('week');
      expect(service.viewType$()).toBe('week');
    });

    it('should change view type to month', () => {
      service.setViewType('month');
      expect(service.viewType$()).toBe('month');
    });
  });

  describe('Event Management', () => {
    it('should add a new event', fakeAsync(() => {
      const newEvent: CalendarEvent = {
        uuid: 'test-123',
        title: 'Test Event',
        start: new Date(2024, 0, 15, 10, 0),
        end: new Date(2024, 0, 15, 11, 0),
        allDay: false
      };

      service.addEvent(newEvent).subscribe();
      tick(400);

      const events = service.events$();
      expect(events.find(e => e.uuid === 'test-123')).toBeTruthy();
    }));

    it('should update an existing event', fakeAsync(() => {
      const event: CalendarEvent = {
        uuid: 'update-test',
        title: 'Original Title',
        start: new Date(2024, 0, 15, 10, 0),
        end: new Date(2024, 0, 15, 11, 0),
        allDay: false
      };

      service.addEvent(event).subscribe();
      tick(400);

      service.updateEvent('update-test', { title: 'Updated Title' }).subscribe();
      tick(400);

      const events = service.events$();
      const updatedEvent = events.find(e => e.uuid === 'update-test');
      expect(updatedEvent?.title).toBe('Updated Title');
    }));

    it('should delete an event', fakeAsync(() => {
      const event: CalendarEvent = {
        uuid: 'delete-test',
        title: 'To Delete',
        start: new Date(2024, 0, 15, 10, 0),
        end: new Date(2024, 0, 15, 11, 0),
        allDay: false
      };

      service.addEvent(event).subscribe();
      tick(400);

      service.deleteEvent('delete-test').subscribe();
      tick(400);

      const events = service.events$();
      expect(events.find(e => e.uuid === 'delete-test')).toBeFalsy();
    }));

    it('should move an event', fakeAsync(() => {
      const event: CalendarEvent = {
        uuid: 'move-test',
        title: 'To Move',
        start: new Date(2024, 0, 15, 10, 0),
        end: new Date(2024, 0, 15, 11, 0),
        allDay: false
      };

      service.addEvent(event).subscribe();
      tick(400);

      const newStart = new Date(2024, 0, 16, 14, 0);
      const newEnd = new Date(2024, 0, 16, 15, 0);

      service.moveEvent('move-test', newStart, newEnd).subscribe();
      tick(400);

      const events = service.events$();
      const movedEvent = events.find(e => e.uuid === 'move-test');
      expect(movedEvent?.start).toEqual(newStart);
      expect(movedEvent?.end).toEqual(newEnd);
    }));
  });

  describe('Event Filtering', () => {
    beforeEach(fakeAsync(() => {
      // Clear events and add test data
      const testEvents: CalendarEvent[] = [
        {
          uuid: 'event1',
          title: 'Event 1',
          start: new Date(2024, 0, 15, 10, 0),
          end: new Date(2024, 0, 15, 11, 0),
          allDay: false
        },
        {
          uuid: 'event2',
          title: 'Event 2',
          start: new Date(2024, 0, 16, 14, 0),
          end: new Date(2024, 0, 16, 15, 0),
          allDay: false
        },
        {
          uuid: 'event3',
          title: 'Event 3',
          start: new Date(2024, 0, 14, 9, 0),
          end: new Date(2024, 0, 17, 17, 0),
          allDay: false
        }
      ];

      // Add events
      testEvents.forEach(event => {
        service.addEvent(event).subscribe();
      });
      tick(400);
    }));

    it('should filter events for date range', fakeAsync(() => {
      const start = new Date(2024, 0, 15, 0, 0);
      const end = new Date(2024, 0, 15, 23, 59);
      tick(400); // Wait for events to be added

      const filteredEvents = service.getEventsForDateRange(start, end);
      
      expect(filteredEvents.some(e => e.uuid === 'event1')).toBeTruthy();
      expect(filteredEvents.some(e => e.uuid === 'event3')).toBeTruthy();
    }));

    it('should filter events for date range as observable', fakeAsync(() => {
      const start = new Date(2024, 0, 15, 0, 0);
      const end = new Date(2024, 0, 15, 23, 59);
      tick(400); // Wait for events to be added

      let filteredEvents: CalendarEvent[] = [];
      service.getEventsForDateRange$(start, end).subscribe(events => {
        filteredEvents = events;
      });
      tick(300);

      expect(filteredEvents.some(e => e.uuid === 'event1')).toBeTruthy();
    }));
  });

  describe('Event Loading', () => {
    it('should load events for range', fakeAsync(() => {
      const start = new Date(2024, 0, 1);
      const end = new Date(2024, 0, 7);

      let loadedEvents: CalendarEvent[] = [];
      service.loadEventsForRange(start, end).subscribe(events => {
        loadedEvents = events;
      });
      tick(400);

      expect(loadedEvents.length).toBeGreaterThan(0);
      expect(loadedEvents.every(e => e.start >= start && e.end <= end)).toBeTruthy();
    }));

    it('should refresh events', fakeAsync(() => {
      const initialCount = service.events$().length;
      
      service.refreshEvents().subscribe();
      tick(400);

      const newCount = service.events$().length;
      expect(newCount).toBeGreaterThan(0);
    }));

    it('should automatically load events when date range changes', fakeAsync(() => {
      // Initial events are already loaded in beforeEach
      expect(service.events$().length).toBeGreaterThan(0);
      
      service.setViewType('day');
      const initialDate = new Date(2024, 0, 1);
      service.setCurrentDate(initialDate);
      tick(300); // Wait for loadEventsForRange delay

      expect(service.events$().length).toBeGreaterThan(0);

      // Change to a different date
      service.setCurrentDate(new Date(2024, 1, 1));
      tick(300); // Wait for loadEventsForRange delay

      // Should still have events (new set loaded)
      expect(service.events$().length).toBeGreaterThan(0);
    }));
  });
});
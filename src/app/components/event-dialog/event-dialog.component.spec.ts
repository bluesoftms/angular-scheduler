import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventDialogComponent } from './event-dialog.component';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CalendarService } from '../../services/calendar.service';
import { signal } from '@angular/core';

describe('EventDialogComponent', () => {
  let component: EventDialogComponent;
  let fixture: ComponentFixture<EventDialogComponent>;
  let calendarService: jasmine.SpyObj<CalendarService>;

  beforeEach(async () => {
    const calendarServiceSpy = jasmine.createSpyObj('CalendarService', [], {
      currentDate$: signal(new Date(2024, 0, 15)),
      viewType$: signal('week'),
      events$: signal([])
    });

    await TestBed.configureTestingModule({
      imports: [EventDialogComponent],
      providers: [
        { provide: CalendarService, useValue: calendarServiceSpy }
      ]
    })
    .compileComponents();

    calendarService = TestBed.inject(CalendarService) as jasmine.SpyObj<CalendarService>;
    fixture = TestBed.createComponent(EventDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with default values for new event', () => {
      component.defaultDate = new Date(2024, 0, 15, 10, 0);
      component.ngOnInit();

      expect(component.formData.title).toBe('');
      expect(component.formData.description).toBe('');
      expect(component.formData.startDate).toBe('2024-01-15');
      expect(component.formData.startTime).toBe('10:00');
      expect(component.formData.endDate).toBe('2024-01-15');
      expect(component.formData.endTime).toBe('11:00'); // One hour later
      expect(component.formData.allDay).toBe(false);
      expect(component.formData.color).toBe('#1a73e8');
      expect(component.formData.location).toBe('');
    });

    it('should initialize with event data for editing', () => {
      const existingEvent: CalendarEvent = {
        uuid: 'test-123',
        title: 'Test Event',
        description: 'Test Description',
        start: new Date(2024, 0, 15, 14, 30),
        end: new Date(2024, 0, 15, 16, 0),
        allDay: false,
        color: '#34a853',
        location: 'Conference Room'
      };

      component.event = existingEvent;
      component.ngOnInit();

      expect(component.formData.title).toBe('Test Event');
      expect(component.formData.description).toBe('Test Description');
      expect(component.formData.startDate).toBe('2024-01-15');
      expect(component.formData.startTime).toBe('14:30');
      expect(component.formData.endDate).toBe('2024-01-15');
      expect(component.formData.endTime).toBe('16:00');
      expect(component.formData.allDay).toBe(false);
      expect(component.formData.color).toBe('#34a853');
      expect(component.formData.location).toBe('Conference Room');
    });

    it('should handle all-day events', () => {
      const allDayEvent: CalendarEvent = {
        uuid: 'all-day-123',
        title: 'All Day Event',
        start: new Date(2024, 0, 15),
        end: new Date(2024, 0, 15),
        allDay: true
      };

      component.event = allDayEvent;
      component.ngOnInit();

      expect(component.formData.allDay).toBe(true);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should emit save event with correct data', () => {
      spyOn(component.save, 'emit');

      component.formData = {
        title: 'New Event',
        description: 'New Description',
        startDate: '2024-01-15',
        startTime: '10:00',
        endDate: '2024-01-15',
        endTime: '11:00',
        allDay: false,
        color: '#1a73e8',
        location: 'Room 101'
      };

      component.onSubmit();

      expect(component.save.emit).toHaveBeenCalled();
      const emittedEvent = (component.save.emit as jasmine.Spy).calls.mostRecent().args[0];
      expect(emittedEvent.title).toBe('New Event');
      expect(emittedEvent.description).toBe('New Description');
      expect(emittedEvent.start).toEqual(new Date(2024, 0, 15, 10, 0));
      expect(emittedEvent.end).toEqual(new Date(2024, 0, 15, 11, 0));
      expect(emittedEvent.allDay).toBe(false);
      expect(emittedEvent.color).toBe('#1a73e8');
      expect(emittedEvent.location).toBe('Room 101');
    });

    it('should not submit if title is empty', () => {
      spyOn(component.save, 'emit');

      component.formData.title = '   ';
      component.onSubmit();

      expect(component.save.emit).not.toHaveBeenCalled();
    });

    it('should validate end time is after start time', () => {
      spyOn(window, 'alert');
      spyOn(component.save, 'emit');

      component.formData = {
        title: 'Invalid Event',
        description: '',
        startDate: '2024-01-15',
        startTime: '14:00',
        endDate: '2024-01-15',
        endTime: '10:00', // Before start time
        allDay: false,
        color: '#1a73e8',
        location: ''
      };

      component.onSubmit();

      expect(window.alert).toHaveBeenCalledWith('End time must be after start time');
      expect(component.save.emit).not.toHaveBeenCalled();
    });

    it('should auto-convert to all-day for multi-day events', () => {
      spyOn(component.save, 'emit');

      component.formData = {
        title: 'Multi-day Event',
        description: '',
        startDate: '2024-01-15',
        startTime: '10:00',
        endDate: '2024-01-17',
        endTime: '14:00',
        allDay: false,
        color: '#1a73e8',
        location: ''
      };

      component.onSubmit();

      expect(component.save.emit).toHaveBeenCalled();
      const emittedEvent = (component.save.emit as jasmine.Spy).calls.mostRecent().args[0];
      expect(emittedEvent.allDay).toBe(true);
    });

    it('should trim whitespace from text fields', () => {
      spyOn(component.save, 'emit');

      component.formData = {
        title: '  Event Title  ',
        description: '  Description  ',
        startDate: '2024-01-15',
        startTime: '10:00',
        endDate: '2024-01-15',
        endTime: '11:00',
        allDay: false,
        color: '#1a73e8',
        location: '  Room 101  '
      };

      component.onSubmit();

      const emittedEvent = (component.save.emit as jasmine.Spy).calls.mostRecent().args[0];
      expect(emittedEvent.title).toBe('Event Title');
      expect(emittedEvent.description).toBe('Description');
      expect(emittedEvent.location).toBe('Room 101');
    });

    it('should generate new UUID for new events', () => {
      spyOn(component.save, 'emit');

      component.event = null;
      component.formData.title = 'New Event';
      component.onSubmit();

      const emittedEvent = (component.save.emit as jasmine.Spy).calls.mostRecent().args[0];
      expect(emittedEvent.uuid).toBeTruthy();
      expect(emittedEvent.uuid.length).toBeGreaterThan(0);
    });

    it('should preserve UUID for existing events', () => {
      spyOn(component.save, 'emit');

      component.event = {
        uuid: 'existing-123',
        title: 'Existing Event',
        start: new Date(),
        end: new Date(),
        allDay: false
      };
      component.formData.title = 'Updated Event';
      component.onSubmit();

      const emittedEvent = (component.save.emit as jasmine.Spy).calls.mostRecent().args[0];
      expect(emittedEvent.uuid).toBe('existing-123');
    });
  });

  describe('Event Deletion', () => {
    it('should emit delete event with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component.delete, 'emit');

      component.event = {
        uuid: 'delete-123',
        title: 'Event to Delete',
        start: new Date(),
        end: new Date(),
        allDay: false
      };

      component.onDelete();

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this event?');
      expect(component.delete.emit).toHaveBeenCalledWith('delete-123');
    });

    it('should not delete if user cancels confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      spyOn(component.delete, 'emit');

      component.event = {
        uuid: 'delete-123',
        title: 'Event to Delete',
        start: new Date(),
        end: new Date(),
        allDay: false
      };

      component.onDelete();

      expect(window.confirm).toHaveBeenCalled();
      expect(component.delete.emit).not.toHaveBeenCalled();
    });

    it('should not delete if no event is selected', () => {
      spyOn(window, 'confirm');
      spyOn(component.delete, 'emit');

      component.event = null;
      component.onDelete();

      expect(window.confirm).not.toHaveBeenCalled();
      expect(component.delete.emit).not.toHaveBeenCalled();
    });
  });

  describe('Dialog Actions', () => {
    it('should emit close event on cancel', () => {
      spyOn(component.close, 'emit');

      component.onCancel();

      expect(component.close.emit).toHaveBeenCalled();
    });
  });

  describe('Date and Time Formatting', () => {
    it('should format date correctly', () => {
      const date = new Date(2024, 0, 5);
      const formatted = component['formatDate'](date);
      expect(formatted).toBe('2024-01-05');
    });

    it('should format time correctly', () => {
      const date = new Date(2024, 0, 15, 9, 5);
      const formatted = component['formatTime'](date);
      expect(formatted).toBe('09:05');
    });

    it('should parse date and time correctly', () => {
      const parsed = component['parseDateTime']('2024-01-15', '14:30', false);
      expect(parsed).toEqual(new Date(2024, 0, 15, 14, 30, 0, 0));
    });

    it('should parse all-day date correctly', () => {
      const parsed = component['parseDateTime']('2024-01-15', '14:30', true);
      expect(parsed).toEqual(new Date(2024, 0, 15, 0, 0, 0, 0));
    });
  });

  describe('Color Selection', () => {
    it('should have predefined color options', () => {
      expect(component.colors).toContain('#1a73e8');
      expect(component.colors).toContain('#34a853');
      expect(component.colors).toContain('#ea4335');
      expect(component.colors.length).toBe(8);
    });
  });

  describe('Mobile Scroll Lock', () => {
    let originalInnerWidth: number;

    beforeEach(() => {
      originalInnerWidth = window.innerWidth;
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth
      });
    });

    it('should lock body scroll on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400
      });

      spyOn(document.body.classList, 'add');
      
      component.ngOnInit();

      expect(document.body.style.overflow).toBe('hidden');
      expect(document.body.style.position).toBe('fixed');
      expect(document.body.classList.add).toHaveBeenCalledWith('dialog-open');
    });

    it('should not lock body scroll on desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      const initialOverflow = document.body.style.overflow;
      
      component.ngOnInit();

      expect(document.body.style.overflow).toBe(initialOverflow);
    });

    it('should restore scroll position on destroy', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400
      });

      spyOn(window, 'scrollTo');
      spyOn(document.body.classList, 'remove');

      component['savedScrollPosition'] = 100;
      component.ngOnDestroy();

      expect(document.body.classList.remove).toHaveBeenCalledWith('dialog-open');
      expect(window.scrollTo).toHaveBeenCalledWith(0, 100);
    });
  });
});

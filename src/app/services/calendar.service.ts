import { Injectable, signal, computed, effect } from '@angular/core';
import { CalendarEvent, ViewType } from '../models/calendar-event.model';
import { Observable, of, delay, map, switchMap } from 'rxjs';
import { getStartOfDay, getEndOfDay, getStartOfWeek, getEndOfWeek, getStartOfMonth, getEndOfMonth } from '../utils/date.utils';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private events = signal<CalendarEvent[]>([]);
  private currentDate = signal<Date>(new Date());
  private viewType = signal<ViewType>('week');
  private apiUrl = 'http://localhost:3000/api';

  events$ = this.events.asReadonly();
  currentDate$ = this.currentDate.asReadonly();
  viewType$ = this.viewType.asReadonly();

  private visibleDateRange = computed(() => {
    const date = this.currentDate();
    const viewType = this.viewType();
    
    let start: Date;
    let end: Date;
    
    switch (viewType) {
      case 'day':
        start = getStartOfDay(date);
        end = getEndOfDay(date);
        break;
      case 'week':
        start = getStartOfWeek(date);
        end = getEndOfWeek(date);
        break;
      case 'month':
        start = getStartOfMonth(date);
        end = getEndOfMonth(date);
        // Add buffer days for month view to show partial weeks
        start = getStartOfWeek(start);
        end = getEndOfWeek(end);
        break;
    }
    
    return { start, end };
  });

  constructor() {
    // Load events whenever the visible date range changes
    effect(() => {
      const range = this.visibleDateRange();
      this.loadEventsForRange(range.start, range.end).subscribe(events => {
        this.events.set(events);
      });
    });
  }

  private generateDummyEvents(startRange: Date, endRange: Date): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    const daysDiff = Math.ceil((endRange.getTime() - startRange.getTime()) / (1000 * 60 * 60 * 24));
    const eventsPerDay = 2 + Math.floor(Math.random() * 3);
    
    for (let day = 0; day < daysDiff; day++) {
      for (let i = 0; i < eventsPerDay; i++) {
        const startDate = new Date(startRange);
        startDate.setDate(startDate.getDate() + day);
        startDate.setHours(9 + Math.floor(Math.random() * 8));
        startDate.setMinutes(Math.random() > 0.5 ? 0 : 30);
        
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 1 + Math.floor(Math.random() * 3));
        
        // Skip weekends for some events
        if (startDate.getDay() === 0 || startDate.getDay() === 6) {
          if (Math.random() > 0.3) continue;
        }
        
        events.push({
          uuid: `event-${startDate.getTime()}-${i}`,
          title: `Meeting ${day * eventsPerDay + i + 1}`,
          description: `Description for meeting on ${startDate.toLocaleDateString()}`,
          start: startDate,
          end: endDate,
          color: ['#4285f4', '#ea4335', '#34a853', '#fbbc04'][Math.floor(Math.random() * 4)],
          allDay: Math.random() > 0.85
        });
      }
    }
    
    return events;
  }

  loadEventsForRange(start: Date, end: Date): Observable<CalendarEvent[]> {
    // Simulate API call with date range parameters
    console.log('Loading events for range:', start.toISOString(), 'to', end.toISOString());
    
    return of({ start, end }).pipe(
      delay(300),
      map(range => this.generateDummyEvents(range.start, range.end))
    );
  }

  loadEvents(): Observable<CalendarEvent[]> {
    const range = this.visibleDateRange();
    return this.loadEventsForRange(range.start, range.end);
  }

  addEvent(event: CalendarEvent): Observable<CalendarEvent> {
    return of(event).pipe(
      delay(300),
      map(newEvent => {
        this.events.update(events => [...events, newEvent]);
        return newEvent;
      })
    );
  }

  updateEvent(uuid: string, updatedEvent: Partial<CalendarEvent>): Observable<CalendarEvent> {
    return of({ uuid, ...updatedEvent } as CalendarEvent).pipe(
      delay(300),
      map(() => {
        let updatedEventData: CalendarEvent | undefined;
        this.events.update(events =>
          events.map(event => {
            if (event.uuid === uuid) {
              updatedEventData = { ...event, ...updatedEvent };
              return updatedEventData;
            }
            return event;
          })
        );
        return updatedEventData!;
      })
    );
  }

  deleteEvent(uuid: string): Observable<void> {
    return of(void 0).pipe(
      delay(300),
      map(() => {
        this.events.update(events => events.filter(event => event.uuid !== uuid));
      })
    );
  }

  moveEvent(uuid: string, newStart: Date, newEnd: Date): Observable<CalendarEvent> {
    return this.updateEvent(uuid, { start: newStart, end: newEnd });
  }

  setCurrentDate(date: Date): void {
    this.currentDate.set(date);
  }

  setViewType(viewType: ViewType): void {
    this.viewType.set(viewType);
  }

  navigatePrevious(): void {
    const current = this.currentDate();
    const newDate = new Date(current);

    switch (this.viewType()) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }

    this.currentDate.set(newDate);
  }

  navigateNext(): void {
    const current = this.currentDate();
    const newDate = new Date(current);

    switch (this.viewType()) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }

    this.currentDate.set(newDate);
  }

  navigateToday(): void {
    this.currentDate.set(new Date());
  }

  getEventsForDateRange(start: Date, end: Date): CalendarEvent[] {
    return this.events().filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return (eventStart >= start && eventStart <= end) ||
             (eventEnd >= start && eventEnd <= end) ||
             (eventStart <= start && eventEnd >= end);
    });
  }

  getEventsForDateRange$(start: Date, end: Date): Observable<CalendarEvent[]> {
    return of(this.getEventsForDateRange(start, end)).pipe(
      delay(200)
    );
  }

  refreshEvents(): Observable<CalendarEvent[]> {
    const range = this.visibleDateRange();
    return this.loadEventsForRange(range.start, range.end).pipe(
      map(events => {
        this.events.set(events);
        return events;
      })
    );
  }
}
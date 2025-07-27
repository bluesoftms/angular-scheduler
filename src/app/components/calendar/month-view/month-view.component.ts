import { Component, Input, Output, EventEmitter, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../../models/calendar-event.model';
import { CalendarService } from '../../../services/calendar.service';
import { getStartOfMonth, getEndOfMonth, isSameDay, formatTime } from '../../../utils/date.utils';

interface MonthDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-month-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './month-view.component.html',
  styleUrl: './month-view.component.css'
})
export class MonthViewComponent {
  @Input({ required: true }) date!: Date;
  @Input({ required: true }) events!: CalendarEvent[];
  @Output() eventClick = new EventEmitter<CalendarEvent>();
  @Output() createEvent = new EventEmitter<Date>();

  calendarService = inject(CalendarService);
  
  draggedEvent: CalendarEvent | null = null;
  draggedOverDay: Date | null = null;

  weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  currentDate = this.calendarService.currentDate$;

  allEvents = computed(() => {
    // Get the date range for the month view (including adjacent days)
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());
    
    const endCalendar = new Date(startCalendar);
    endCalendar.setDate(endCalendar.getDate() + 42); // 6 weeks
    
    return this.calendarService.getEventsForDateRange(startCalendar, endCalendar);
  });

  monthDays = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());

    const days: MonthDay[] = [];
    const today = new Date();
    const events = this.allEvents(); // Use the computed events
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const currentDate = new Date(startCalendar);
      currentDate.setDate(startCalendar.getDate() + i);
      
      days.push({
        date: currentDate,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: isSameDay(currentDate, today),
        events: this.getEventsForDayFromList(currentDate, events)
      });
    }

    return days;
  });

  monthWeeks = computed(() => {
    const days = this.monthDays();
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  });

  getEventsForDay(date: Date): CalendarEvent[] {
    return this.allEvents().filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      return isSameDay(eventStart, date) || 
             isSameDay(eventEnd, date) ||
             (eventStart <= date && eventEnd >= date);
    });
  }

  getEventsForDayFromList(date: Date, events: CalendarEvent[]): CalendarEvent[] {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      return isSameDay(eventStart, date) || 
             isSameDay(eventEnd, date) ||
             (eventStart <= date && eventEnd >= date);
    });
  }

  getDayNumber(date: Date): number {
    return date.getDate();
  }

  getVisibleEvents(day: MonthDay, maxEvents: number = 3): CalendarEvent[] {
    return day.events.slice(0, maxEvents);
  }

  getMoreEventsCount(day: MonthDay, maxEvents: number = 3): number {
    return Math.max(0, day.events.length - maxEvents);
  }

  onDayClick(day: MonthDay): void {
    if (!day.isCurrentMonth) {
      this.calendarService.setCurrentDate(day.date);
    } else {
      this.createEvent.emit(day.date);
    }
  }

  onEventClick(event: CalendarEvent, e: Event): void {
    e.stopPropagation();
    this.eventClick.emit(event);
  }

  formatEventTime(date: Date): string {
    return formatTime(new Date(date));
  }

  onDragStart(event: DragEvent, calendarEvent: CalendarEvent): void {
    this.draggedEvent = calendarEvent;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', calendarEvent.uuid);
    }
  }

  onDragEnd(event: DragEvent): void {
    this.draggedEvent = null;
    this.draggedOverDay = null;
  }

  onDragOver(event: DragEvent, day: MonthDay): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.draggedOverDay = day.date;
  }

  onDragLeave(event: DragEvent): void {
    this.draggedOverDay = null;
  }

  onDrop(event: DragEvent, day: MonthDay): void {
    event.preventDefault();
    
    if (this.draggedEvent) {
      const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
      
      const newStart = new Date(day.date);
      if (!this.draggedEvent.allDay) {
        newStart.setHours(this.draggedEvent.start.getHours(), this.draggedEvent.start.getMinutes());
      }
      
      const newEnd = new Date(newStart.getTime() + duration);
      
      // If event becomes multi-day when dropped, convert to all-day
      if (!this.draggedEvent.allDay && !isSameDay(newStart, newEnd)) {
        this.calendarService.updateEvent(this.draggedEvent.uuid, {
          start: new Date(newStart.setHours(0, 0, 0, 0)),
          end: new Date(newEnd.setHours(23, 59, 59, 999)),
          allDay: true
        }).subscribe();
      } else {
        this.calendarService.moveEvent(this.draggedEvent.uuid, newStart, newEnd).subscribe();
      }
    }
    
    this.draggedEvent = null;
    this.draggedOverDay = null;
  }

  isDraggedOver(day: MonthDay): boolean {
    return this.draggedOverDay !== null && isSameDay(this.draggedOverDay, day.date);
  }
}
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarService } from '../../services/calendar.service';
import { CalendarEvent, ViewType } from '../../models/calendar-event.model';
import { DayViewComponent } from './day-view/day-view.component';
import { WeekViewComponent } from './week-view/week-view.component';
import { MonthViewComponent } from './month-view/month-view.component';
import { EventDialogComponent } from '../event-dialog/event-dialog.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DayViewComponent, WeekViewComponent, MonthViewComponent, EventDialogComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent {
  calendarService = inject(CalendarService);

  currentDate = this.calendarService.currentDate$;
  viewType = this.calendarService.viewType$;
  events = this.calendarService.events$;

  showEventDialog = signal(false);
  selectedEvent = signal<CalendarEvent | null>(null);
  dialogDefaultDate = signal(new Date());

  formattedDate = computed(() => {
    const date = this.currentDate();
    const viewType = this.viewType();
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long'
    };

    if (viewType === 'day') {
      options.day = 'numeric';
    }

    return date.toLocaleDateString('en-US', options);
  });

  changeView(viewType: ViewType): void {
    this.calendarService.setViewType(viewType);
  }

  navigatePrevious(): void {
    this.calendarService.navigatePrevious();
  }

  navigateNext(): void {
    this.calendarService.navigateNext();
  }

  navigateToday(): void {
    this.calendarService.navigateToday();
  }

  onDateSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      const selectedDate = new Date(input.value + 'T00:00:00');
      this.calendarService.setCurrentDate(selectedDate);
    }
  }

  formatDateForInput(): string {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  createEvent(): void {
    this.selectedEvent.set(null);
    this.dialogDefaultDate.set(this.currentDate());
    this.showEventDialog.set(true);
  }

  createEventAtDate(date: Date): void {
    this.selectedEvent.set(null);
    this.dialogDefaultDate.set(date);
    this.showEventDialog.set(true);
  }

  editEvent(event: CalendarEvent): void {
    this.selectedEvent.set(event);
    this.showEventDialog.set(true);
  }

  onEventSave(event: CalendarEvent): void {
    if (this.selectedEvent()) {
      this.calendarService.updateEvent(event.uuid, event).subscribe();
    } else {
      this.calendarService.addEvent(event).subscribe();
    }
    this.showEventDialog.set(false);
  }

  onEventDelete(eventId: string): void {
    this.calendarService.deleteEvent(eventId).subscribe();
    this.showEventDialog.set(false);
  }

  onDialogClose(): void {
    this.showEventDialog.set(false);
    this.selectedEvent.set(null);
  }

  ngOnInit(): void {
    // Add some sample events
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const sampleEvents: CalendarEvent[] = [
      {
        uuid: '1',
        title: 'Team Meeting',
        description: 'Weekly team sync',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        allDay: false,
        color: '#1a73e8',
        location: 'Conference Room A'
      },
      {
        uuid: '2',
        title: 'Lunch with Client',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
        allDay: false,
        color: '#34a853',
        location: 'Restaurant Downtown'
      },
      {
        uuid: '3',
        title: 'Project Deadline',
        start: new Date(tomorrow),
        end: new Date(tomorrow),
        allDay: true,
        color: '#ea4335'
      },
      {
        uuid: '4',
        title: 'Code Review',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30),
        allDay: false,
        color: '#fbbc04'
      },
      {
        uuid: '5',
        title: 'Overlapping Meeting 1',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30),
        allDay: false,
        color: '#9c27b0'
      },
      {
        uuid: '6',
        title: 'Overlapping Meeting 2',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
        allDay: false,
        color: '#ff6f00'
      },
      {
        uuid: '7',
        title: 'Quick Sync',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 15),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 45),
        allDay: false,
        color: '#0097a7'
      }
    ];

    sampleEvents.forEach(event => this.calendarService.addEvent(event).subscribe());
  }
}
import { Component, EventEmitter, Input, Output, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarEvent } from '../../models/calendar-event.model';
import { CalendarService } from '../../services/calendar.service';

@Component({
  selector: 'app-event-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-dialog.component.html',
  styleUrl: './event-dialog.component.css'
})
export class EventDialogComponent implements OnDestroy {
  @Input() event: CalendarEvent | null = null;
  @Input() defaultDate: Date = new Date();
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<CalendarEvent>();
  @Output() delete = new EventEmitter<string>();

  calendarService = inject(CalendarService);

  formData = {
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    color: '#1a73e8',
    location: ''
  };

  colors = [
    '#1a73e8', // Blue
    '#34a853', // Green
    '#fbbc04', // Yellow
    '#ea4335', // Red
    '#9c27b0', // Purple
    '#ff6f00', // Orange
    '#0097a7', // Teal
    '#795548'  // Brown
  ];

  private savedScrollPosition = 0;

  ngOnInit() {
    // Prevent body scroll on mobile when dialog is open
    if (window.innerWidth <= 480) {
      // Save current scroll position
      this.savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.savedScrollPosition}px`;
      document.body.style.width = '100%';
      
      // Add class for additional styling if needed
      document.body.classList.add('dialog-open');
    }
    
    if (this.event) {
      // Edit mode
      const start = new Date(this.event.start);
      const end = new Date(this.event.end);
      
      this.formData = {
        title: this.event.title,
        description: this.event.description || '',
        startDate: this.formatDate(start),
        startTime: this.formatTime(start),
        endDate: this.formatDate(end),
        endTime: this.formatTime(end),
        allDay: this.event.allDay,
        color: this.event.color || '#1a73e8',
        location: this.event.location || ''
      };
    } else {
      // Create mode
      const start = new Date(this.defaultDate);
      const end = new Date(this.defaultDate);
      end.setHours(end.getHours() + 1);
      
      this.formData = {
        title: '',
        description: '',
        startDate: this.formatDate(start),
        startTime: this.formatTime(start),
        endDate: this.formatDate(end),
        endTime: this.formatTime(end),
        allDay: false,
        color: '#1a73e8',
        location: ''
      };
    }
  }

  onSubmit() {
    if (!this.formData.title.trim()) return;

    let start = this.parseDateTime(this.formData.startDate, this.formData.startTime, this.formData.allDay);
    let end = this.parseDateTime(this.formData.endDate, this.formData.endTime, this.formData.allDay);

    if (end < start) {
      alert('End time must be after start time');
      return;
    }

    // Auto-convert to all-day if event spans multiple days
    let allDay = this.formData.allDay;
    if (!allDay) {
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      if (startDay.getTime() !== endDay.getTime()) {
        allDay = true;
        start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0);
        end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
      }
    }

    const eventData: CalendarEvent = {
      uuid: this.event?.uuid || this.generateId(),
      title: this.formData.title.trim(),
      description: this.formData.description.trim(),
      start,
      end,
      allDay,
      color: this.formData.color,
      location: this.formData.location.trim()
    };

    this.save.emit(eventData);
  }

  onDelete() {
    if (this.event && confirm('Are you sure you want to delete this event?')) {
      this.delete.emit(this.event.uuid);
    }
  }

  onCancel() {
    this.close.emit();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private parseDateTime(dateStr: string, timeStr: string, allDay: boolean): Date {
    const date = new Date(dateStr);
    
    if (!allDay && timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    } else if (allDay) {
      date.setHours(0, 0, 0, 0);
    }
    
    return date;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  ngOnDestroy(): void {
    // Restore body scroll on mobile
    if (window.innerWidth <= 480) {
      // Remove class
      document.body.classList.remove('dialog-open');
      
      // Restore body styles
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      // Restore scroll position
      window.scrollTo(0, this.savedScrollPosition);
    }
  }
}
import { Component, Input, Output, EventEmitter, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../../models/calendar-event.model';
import { CalendarService } from '../../../services/calendar.service';
import { getStartOfWeek, getEndOfWeek, formatTime, getHourPosition, isSameDay, getTimeFromMousePosition } from '../../../utils/date.utils';
import { calculateEventPositions, EventPosition, DropPreviewEvent } from '../../../utils/overlap.utils';

@Component({
  selector: 'app-week-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './week-view.component.html',
  styleUrl: './week-view.component.css'
})
export class WeekViewComponent implements OnDestroy {
  @Input({ required: true }) date!: Date;
  @Input({ required: true }) events!: CalendarEvent[];
  @Output() eventClick = new EventEmitter<CalendarEvent>();
  @Output() createEvent = new EventEmitter<Date>();

  calendarService = inject(CalendarService);
  
  draggedEvent: CalendarEvent | null = null;
  draggedOverSlot: { day: Date; hour: number; minutes: number } | null = null;
  dropPreview = signal<{ day: Date; preview: DropPreviewEvent } | null>(null);
  hoveredEventId: string | null = null;
  
  resizingEvent: CalendarEvent | null = null;
  resizeMode: 'top' | 'bottom' | null = null;
  resizeStartY: number = 0;
  resizeStartTime: Date | null = null;
  resizeEndTime: Date | null = null;

  hours = Array.from({ length: 24 }, (_, i) => i);
  
  currentDate = this.calendarService.currentDate$;

  weekDays = computed(() => {
    const date = this.currentDate();
    const startOfWeek = getStartOfWeek(date);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  });

  weekEvents = computed(() => {
    const date = this.currentDate();
    const weekStart = getStartOfWeek(date);
    const weekEnd = getEndOfWeek(date);
    
    return this.calendarService.getEventsForDateRange(weekStart, weekEnd);
  });

  getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  getDayNumber(date: Date): number {
    return date.getDate();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return isSameDay(date, today);
  }

  formatHour(hour: number): string {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return formatTime(date);
  }

  getEventsForDay(day: Date): CalendarEvent[] {
    return this.weekEvents().filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      return isSameDay(eventStart, day) || 
             isSameDay(eventEnd, day) ||
             (eventStart < day && eventEnd > day);
    });
  }

  getAllDayEventsForDay(day: Date): CalendarEvent[] {
    return this.getEventsForDay(day).filter(event => event.allDay);
  }

  getTimedEventsForDay(day: Date): CalendarEvent[] {
    return this.getEventsForDay(day).filter(event => !event.allDay);
  }

  getTimedEventPositionsForDay(day: Date): EventPosition[] {
    const timedEvents = this.getTimedEventsForDay(day);
    // Always calculate normal positions to prevent jumping
    return calculateEventPositions(timedEvents);
  }
  
  getPreviewEventStyle(day: Date): any | null {
    const preview = this.dropPreview();
    if (!preview || !preview.day || !isSameDay(preview.day, day) || !this.draggedEvent || this.draggedEvent.allDay) {
      return null;
    }
    
    const startHour = getHourPosition(preview.preview.start);
    const endHour = getHourPosition(preview.preview.end);
    const duration = endHour - startHour;
    
    return {
      position: 'absolute',
      top: `${startHour * 60}px`,
      height: `${duration * 60 - 2}px`,
      backgroundColor: this.draggedEvent.color || '#1a73e8',
      left: '2%',
      width: '96%',
      opacity: 0.6,
      pointerEvents: 'none',
      zIndex: 100,
      borderRadius: '4px',
      border: '2px dashed rgba(255, 255, 255, 0.8)'
    };
  }

  getEventStyle(position: EventPosition, day: Date): any {
    const event = position.event;
    if (event.allDay) return {};

    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    const startHour = isSameDay(eventStart, day) ? getHourPosition(eventStart) : 0;
    const endHour = isSameDay(eventEnd, day) ? getHourPosition(eventEnd) : 24;
    const duration = endHour - startHour;

    // Calculate position based on overlapping events
    const padding = 2;
    const left = padding + (position.left * (100 - 2 * padding) / 100);
    const width = (position.width * (100 - 2 * padding) / 100) - padding;

    return {
      top: `${startHour * 60}px`,
      height: `${duration * 60 - 2}px`,
      backgroundColor: event.color || '#1a73e8',
      left: `${left}%`,
      width: `${width}%`,
      right: 'auto'
    };
  }

  onEventClick(event: CalendarEvent): void {
    this.eventClick.emit(event);
  }

  onTimeSlotClick(event: MouseEvent, hour: number, day: Date): void {
    // Calculate the exact click position
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const slotHeight = rect.height;
    
    const time = getTimeFromMousePosition(hour, offsetY, slotHeight);
    
    const newEventStart = new Date(day);
    newEventStart.setHours(time.hour, time.minutes, 0, 0);
    this.createEvent.emit(newEventStart);
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

  // Touch event support
  private touchStartX = 0;
  private touchStartY = 0;
  private touchEvent: CalendarEvent | null = null;
  private touchTimeout: any;

  onTouchStart(event: TouchEvent, calendarEvent: CalendarEvent): void {
    event.preventDefault();
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.touchEvent = calendarEvent;
    
    // Long press for options
    this.touchTimeout = setTimeout(() => {
      this.onEventClick(calendarEvent);
    }, 500);
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.touchEvent) return;
    
    clearTimeout(this.touchTimeout);
    event.preventDefault();
    
    const touch = event.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    
    // Only start drag if moved significantly
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      this.draggedEvent = this.touchEvent;
      // Update visual feedback
      const element = event.target as HTMLElement;
      element.style.opacity = '0.5';
      
      // Update drop preview based on touch position
      this.updateTouchDropPreview(touch);
    }
  }
  
  private updateTouchDropPreview(touch: Touch): void {
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element) {
      const hourSlot = element.closest('.hour-slot');
      if (hourSlot) {
        const dayColumn = hourSlot.closest('.day-column');
        const hour = parseInt(hourSlot.getAttribute('data-hour') || '0');
        
        if (dayColumn) {
          const dayIndex = Array.from(dayColumn.parentElement!.children).indexOf(dayColumn);
          const day = this.weekDays()[dayIndex];
          
          if (day) {
            // Calculate position within the hour slot
            const rect = hourSlot.getBoundingClientRect();
            const offsetY = touch.clientY - rect.top;
            const slotHeight = rect.height;
            
            const time = getTimeFromMousePosition(hour, offsetY, slotHeight);
            this.draggedOverSlot = { day, hour: time.hour, minutes: time.minutes };
            
            // Update drop preview if dragging a timed event
            if (this.draggedEvent && !this.draggedEvent.allDay) {
              const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
              const previewStart = new Date(day);
              previewStart.setHours(time.hour, time.minutes, 0, 0);
              const previewEnd = new Date(previewStart.getTime() + duration);
              
              this.dropPreview.set({
                day,
                preview: {
                  start: previewStart,
                  end: previewEnd
                }
              });
            }
          }
        }
      } else {
        // Clear preview if not over a valid drop zone
        this.draggedOverSlot = null;
        this.dropPreview.set(null);
      }
    }
  }

  onTouchEnd(event: TouchEvent): void {
    clearTimeout(this.touchTimeout);
    
    if (this.draggedEvent && this.touchEvent) {
      const touch = event.changedTouches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      
      if (element) {
        // Use the stored slot from the last touch move for precise positioning
        if (this.draggedOverSlot) {
          this.handleTouchDropWithTime(
            touch, 
            this.draggedOverSlot.hour, 
            this.draggedOverSlot.minutes,
            this.draggedOverSlot.day
          );
        } else {
          // Fallback to basic drop handling
          const hourSlot = element.closest('.hour-slot');
          if (hourSlot) {
            const dayColumn = hourSlot.closest('.day-column');
            const hour = parseInt(hourSlot.getAttribute('data-hour') || '0');
            
            if (dayColumn) {
              const dayIndex = Array.from(dayColumn.parentElement!.children).indexOf(dayColumn);
              const day = this.weekDays()[dayIndex];
              
              if (day) {
                this.handleTouchDrop(touch, hour, day);
              }
            }
          }
        }
        
        // Check if dropped on all-day section
        const allDayCell = element.closest('.all-day-cell');
        if (allDayCell && !this.draggedOverSlot) {
          const dayIndex = Array.from(allDayCell.parentElement!.children).indexOf(allDayCell) - 1; // -1 for label
          const day = this.weekDays()[dayIndex];
          if (day) {
            this.onAllDayDrop(event as any, day);
          }
        }
      }
      
      // Reset opacity
      const draggedElement = event.target as HTMLElement;
      draggedElement.style.opacity = '';
    } else if (this.touchEvent && !this.draggedEvent) {
      // This was a tap - check if we moved too much
      const touch = event.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - this.touchStartX);
      const deltaY = Math.abs(touch.clientY - this.touchStartY);
      
      // If movement is minimal, treat as tap
      if (deltaX < 10 && deltaY < 10) {
        this.onEventClick(this.touchEvent);
      }
    }
    
    // Clear all drag state
    this.draggedEvent = null;
    this.touchEvent = null;
    this.draggedOverSlot = null;
    this.dropPreview.set(null);
  }

  private handleTouchDrop(touch: Touch, hour: number, day: Date): void {
    if (!this.draggedEvent) return;
    
    const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
    const newStart = new Date(day);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);
    
    this.calendarService.moveEvent(this.draggedEvent.uuid, newStart, newEnd).subscribe();
  }
  
  private handleTouchDropWithTime(touch: Touch, hour: number, minutes: number, day: Date): void {
    if (!this.draggedEvent) return;
    
    const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
    const newStart = new Date(day);
    newStart.setHours(hour, minutes, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);
    
    this.calendarService.moveEvent(this.draggedEvent.uuid, newStart, newEnd).subscribe();
  }

  onDragEnd(event: DragEvent): void {
    this.draggedEvent = null;
    this.draggedOverSlot = null;
    this.dropPreview.set(null);
  }

  onDragOver(event: DragEvent, hour: number, day: Date): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    // Calculate the position within the hour slot
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const slotHeight = rect.height;
    
    const time = getTimeFromMousePosition(hour, offsetY, slotHeight);
    this.draggedOverSlot = { day, hour: time.hour, minutes: time.minutes };

    // Update drop preview if dragging a timed event
    if (this.draggedEvent && !this.draggedEvent.allDay) {
      const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
      const previewStart = new Date(day);
      previewStart.setHours(time.hour, time.minutes, 0, 0);
      const previewEnd = new Date(previewStart.getTime() + duration);
      
      this.dropPreview.set({
        day,
        preview: {
          start: previewStart,
          end: previewEnd
        }
      });
    }
  }

  onDragLeave(event: DragEvent): void {
    this.draggedOverSlot = null;
    this.dropPreview.set(null);
  }

  onDrop(event: DragEvent, hour: number, day: Date): void {
    event.preventDefault();
    
    if (this.draggedEvent && !this.draggedEvent.allDay) {
      const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
      
      // Calculate the exact drop position
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const offsetY = event.clientY - rect.top;
      const slotHeight = rect.height;
      
      const time = getTimeFromMousePosition(hour, offsetY, slotHeight);
      
      const newStart = new Date(day);
      newStart.setHours(time.hour, time.minutes, 0, 0);
      
      const newEnd = new Date(newStart.getTime() + duration);
      
      this.calendarService.moveEvent(this.draggedEvent.uuid, newStart, newEnd).subscribe();
    }
    
    this.draggedEvent = null;
    this.draggedOverSlot = null;
    this.dropPreview.set(null);
  }

  onAllDayDrop(event: DragEvent, day: Date): void {
    event.preventDefault();
    
    if (this.draggedEvent) {
      const newStart = new Date(day);
      newStart.setHours(0, 0, 0, 0);
      
      const newEnd = new Date(day);
      newEnd.setHours(23, 59, 59, 999);
      
      this.calendarService.updateEvent(this.draggedEvent.uuid, {
        start: newStart,
        end: newEnd,
        allDay: true
      }).subscribe();
    }
    
    this.draggedEvent = null;
  }

  isDraggedOver(day: Date, hour: number): boolean {
    if (hour === -1) {
      // Check if any hour is dragged over for this day
      return this.draggedOverSlot !== null && isSameDay(this.draggedOverSlot.day, day);
    }
    return this.draggedOverSlot !== null &&
           isSameDay(this.draggedOverSlot.day, day) &&
           this.draggedOverSlot.hour === hour;
  }

  getDropIndicatorPosition(): number {
    if (!this.draggedOverSlot) return 0;
    return this.draggedOverSlot.hour * 60 + this.draggedOverSlot.minutes;
  }

  formatDropTime(): string {
    if (!this.draggedOverSlot) return '';
    
    const date = new Date();
    date.setHours(this.draggedOverSlot.hour, this.draggedOverSlot.minutes, 0, 0);
    return formatTime(date);
  }

  isSameDay(date1: Date | undefined, date2: Date): boolean {
    if (!date1) return false;
    return isSameDay(date1, date2);
  }

  onEventDragOver(event: DragEvent, calendarEvent: CalendarEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.draggedEvent && this.draggedEvent.uuid !== calendarEvent.uuid) {
      this.hoveredEventId = calendarEvent.uuid;
    }
  }

  onEventDragLeave(event: DragEvent): void {
    this.hoveredEventId = null;
  }

  onResizeStart(event: MouseEvent, calendarEvent: CalendarEvent, mode: 'top' | 'bottom'): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.resizingEvent = calendarEvent;
    this.resizeMode = mode;
    this.resizeStartY = event.clientY;
    this.resizeStartTime = new Date(calendarEvent.start);
    this.resizeEndTime = new Date(calendarEvent.end);
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
  }

  onResizeMove = (event: MouseEvent): void => {
    if (!this.resizingEvent || !this.resizeMode) return;
    
    const deltaY = event.clientY - this.resizeStartY;
    const minutesDelta = Math.round((deltaY / 60) * 60 / 15) * 15; // 15-minute increments
    
    if (this.resizeMode === 'top') {
      // Resizing from top - change start time
      const newStart = new Date(this.resizeStartTime!);
      newStart.setMinutes(newStart.getMinutes() + minutesDelta);
      
      // Don't allow start to go past end
      if (newStart < this.resizingEvent.end) {
        this.calendarService.updateEvent(this.resizingEvent.uuid, {
          start: newStart
        }).subscribe();
      }
    } else {
      // Resizing from bottom - change end time
      const newEnd = new Date(this.resizeEndTime!);
      newEnd.setMinutes(newEnd.getMinutes() + minutesDelta);
      
      // Don't allow end to go before start
      if (newEnd > this.resizingEvent.start) {
        this.calendarService.updateEvent(this.resizingEvent.uuid, {
          end: newEnd
        }).subscribe();
      }
    }
  }

  onResizeEnd = (event: MouseEvent): void => {
    // Remove global mouse event listeners
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);
    
    this.resizingEvent = null;
    this.resizeMode = null;
    this.resizeStartY = 0;
    this.resizeStartTime = null;
    this.resizeEndTime = null;
  }

  ngOnDestroy(): void {
    // Clean up any active resize listeners
    if (this.resizingEvent) {
      document.removeEventListener('mousemove', this.onResizeMove);
      document.removeEventListener('mouseup', this.onResizeEnd);
    }
    
    // Clean up any pending touch timeout
    if (this.touchTimeout) {
      clearTimeout(this.touchTimeout);
    }
  }
}
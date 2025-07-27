import { Component, Input, Output, EventEmitter, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../../models/calendar-event.model';
import { CalendarService } from '../../../services/calendar.service';
import { getStartOfDay, getEndOfDay, formatTime, getHourPosition, getDurationInHours, isSameDay, getTimeFromMousePosition } from '../../../utils/date.utils';
import { calculateEventPositions, EventPosition, DropPreviewEvent } from '../../../utils/overlap.utils';

@Component({
  selector: 'app-day-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './day-view.component.html',
  styleUrl: './day-view.component.css'
})
export class DayViewComponent implements OnDestroy {
  @Input({ required: true }) date!: Date;
  @Input({ required: true }) events!: CalendarEvent[];
  @Output() eventClick = new EventEmitter<CalendarEvent>();
  @Output() createEvent = new EventEmitter<Date>();

  calendarService = inject(CalendarService);
  
  draggedEvent: CalendarEvent | null = null;
  draggedOverHour: number | null = null;
  draggedOverMinutes: number = 0;
  dropPreview = signal<DropPreviewEvent | null>(null);
  hoveredEventId: string | null = null;
  
  resizingEvent: CalendarEvent | null = null;
  resizeMode: 'top' | 'bottom' | null = null;
  resizeStartY: number = 0;
  resizeStartTime: Date | null = null;
  resizeEndTime: Date | null = null;

  hours = Array.from({ length: 24 }, (_, i) => i);

  currentDate = this.calendarService.currentDate$;

  dayEvents = computed(() => {
    const date = this.currentDate();
    const dayStart = getStartOfDay(date);
    const dayEnd = getEndOfDay(date);
    
    return this.calendarService.getEventsForDateRange(dayStart, dayEnd);
  });

  allDayEvents = computed(() => {
    return this.dayEvents().filter(event => event.allDay);
  });

  timedEvents = computed(() => {
    return this.dayEvents().filter(event => !event.allDay);
  });

  timedEventPositions = computed(() => {
    // Always calculate normal positions without preview to prevent jumping
    return calculateEventPositions(this.timedEvents());
  });
  
  // Separate computed for preview position
  previewEventStyle = computed(() => {
    const preview = this.dropPreview();
    if (!preview || !this.draggedEvent || this.draggedEvent.allDay) {
      return null;
    }
    
    // Calculate where the preview would be positioned
    const previewEvent: CalendarEvent = {
      uuid: '__preview__',
      title: this.draggedEvent.title,
      start: preview.start,
      end: preview.end,
      allDay: false,
      color: this.draggedEvent.color
    };
    
    // Get all events that would be at the same time as preview
    const overlappingEvents = this.timedEvents().filter(event => 
      event.uuid !== this.draggedEvent!.uuid && 
      this.eventsOverlap(event, previewEvent)
    );
    
    // Simple positioning for preview
    const columnCount = overlappingEvents.length + 1;
    const columnWidth = 100 / columnCount;
    
    const startHour = getHourPosition(preview.start);
    const endHour = getHourPosition(preview.end);
    const duration = endHour - startHour;
    
    return {
      top: `${startHour * 60}px`,
      height: `${duration * 60 - 2}px`,
      backgroundColor: this.draggedEvent.color || '#1a73e8',
      left: `${(columnCount - 1) * columnWidth}%`,
      width: `${columnWidth - 1}%`,
      opacity: 0.6,
      pointerEvents: 'none',
      zIndex: 100
    };
  });
  
  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return event1.start < event2.end && event2.start < event1.end;
  }

  formatHour(hour: number): string {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return formatTime(date);
  }

  formatEventTime(date: Date): string {
    return formatTime(new Date(date));
  }

  getEventStyle(position: EventPosition): any {
    const event = position.event;
    if (event.allDay) return {};

    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const date = this.currentDate();
    const dayStart = getStartOfDay(date);
    
    // Calculate position and height
    const startHour = isSameDay(eventStart, date) ? getHourPosition(eventStart) : 0;
    const endHour = isSameDay(eventEnd, date) ? getHourPosition(eventEnd) : 24;
    const duration = endHour - startHour;

    // Calculate horizontal position based on overlapping events
    // Events are now positioned within the events-container which already has left: 60px
    const leftPercent = position.left;
    const widthPercent = position.width - 1; // 1% gap between events

    return {
      top: `${startHour * 60}px`,
      height: `${duration * 60 - 2}px`,
      backgroundColor: event.color || '#1a73e8',
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      right: 'auto'
    };
  }

  onEventClick(event: CalendarEvent): void {
    this.eventClick.emit(event);
  }

  onTimeSlotClick(event: MouseEvent, hour: number): void {
    // Calculate the exact click position
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const slotHeight = rect.height;
    
    const time = getTimeFromMousePosition(hour, offsetY, slotHeight);
    
    const date = this.currentDate();
    const newEventStart = new Date(date);
    newEventStart.setHours(time.hour, time.minutes, 0, 0);
    this.createEvent.emit(newEventStart);
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
    
    // Set a flag to track if this is a tap or drag
    this.touchTimeout = setTimeout(() => {
      // If we haven't moved, start drag mode
      this.draggedEvent = calendarEvent;
    }, 200);
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
      // Check if we're over an existing event
      const eventElement = element.closest('.timed-event');
      if (eventElement && this.draggedEvent) {
        // Find which event we're hovering over
        const eventId = this.getEventIdFromElement(eventElement);
        if (eventId && eventId !== this.draggedEvent.uuid) {
          this.hoveredEventId = eventId;
          
          // Find the hovered event and use its time for preview
          const hoveredEvent = this.timedEvents().find(e => e.uuid === eventId);
          if (hoveredEvent && !this.draggedEvent.allDay) {
            const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
            const previewStart = new Date(hoveredEvent.start);
            const previewEnd = new Date(previewStart.getTime() + duration);
            
            this.dropPreview.set({
              start: previewStart,
              end: previewEnd
            });
            
            // Store the time for the drop
            this.draggedOverHour = previewStart.getHours();
            this.draggedOverMinutes = previewStart.getMinutes();
          }
        }
      } else {
        // Not over an event, calculate position normally
        this.hoveredEventId = null;
        const hourSlot = element.closest('.hour-slot');
        if (hourSlot) {
          const hourRow = hourSlot.closest('.hour-row');
          if (hourRow) {
            const hourIndex = Array.from(hourRow.parentElement!.children).indexOf(hourRow);
            
            // Calculate position within the hour slot
            const rect = hourSlot.getBoundingClientRect();
            const offsetY = touch.clientY - rect.top;
            const slotHeight = rect.height;
            
            const time = getTimeFromMousePosition(hourIndex, offsetY, slotHeight);
            this.draggedOverHour = time.hour;
            this.draggedOverMinutes = time.minutes;
            
            // Update drop preview if dragging a timed event
            if (this.draggedEvent && !this.draggedEvent.allDay) {
              const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
              const date = this.currentDate();
              const previewStart = new Date(date);
              previewStart.setHours(time.hour, time.minutes, 0, 0);
              const previewEnd = new Date(previewStart.getTime() + duration);
              
              this.dropPreview.set({
                start: previewStart,
                end: previewEnd
              });
            }
          }
        } else {
          // Clear preview if not over a valid drop zone
          this.draggedOverHour = null;
          this.draggedOverMinutes = 0;
          this.dropPreview.set(null);
        }
      }
    }
  }
  
  private getEventIdFromElement(element: Element): string | null {
    // Look through the event positions to find which event this element belongs to
    const positions = this.timedEventPositions();
    for (const position of positions) {
      const eventStyle = this.getEventStyle(position);
      const top = eventStyle.top;
      const elementRect = element.getBoundingClientRect();
      const parentRect = element.parentElement?.getBoundingClientRect();
      
      if (parentRect) {
        const elementTop = elementRect.top - parentRect.top;
        // Check if this element's position matches the event position
        if (Math.abs(elementTop - parseFloat(top)) < 5) {
          return position.event.uuid;
        }
      }
    }
    return null;
  }

  onTouchEnd(event: TouchEvent): void {
    clearTimeout(this.touchTimeout);
    
    if (this.draggedEvent && this.touchEvent) {
      // This was a drag operation
      const touch = event.changedTouches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      
      if (element) {
        // Find the hour slot that was touched
        const hourSlot = element.closest('.hour-slot');
        if (hourSlot) {
          const hourRow = hourSlot.closest('.hour-row');
          if (hourRow) {
            const hourIndex = Array.from(hourRow.parentElement!.children).indexOf(hourRow);
            
            // Use the stored time from the last touch move for precise positioning
            if (this.draggedOverHour !== null) {
              this.handleTouchDropWithTime(touch, this.draggedOverHour, this.draggedOverMinutes);
            } else {
              this.handleTouchDrop(touch, hourIndex);
            }
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
    this.draggedOverHour = null;
    this.draggedOverMinutes = 0;
    this.dropPreview.set(null);
    this.hoveredEventId = null;
  }

  private handleTouchDrop(touch: Touch, hour: number): void {
    if (!this.draggedEvent) return;
    
    const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
    const date = this.currentDate();
    const newStart = new Date(date);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);
    
    this.calendarService.moveEvent(this.draggedEvent.uuid, newStart, newEnd).subscribe();
  }
  
  private handleTouchDropWithTime(touch: Touch, hour: number, minutes: number): void {
    if (!this.draggedEvent) return;
    
    const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
    let newStart: Date;
    
    // Check if we're dropping over an existing event
    if (this.hoveredEventId) {
      const hoveredEvent = this.timedEvents().find(e => e.uuid === this.hoveredEventId);
      if (hoveredEvent) {
        newStart = new Date(hoveredEvent.start);
      } else {
        // Fallback to provided time
        const date = this.currentDate();
        newStart = new Date(date);
        newStart.setHours(hour, minutes, 0, 0);
      }
    } else {
      // Use the provided time
      const date = this.currentDate();
      newStart = new Date(date);
      newStart.setHours(hour, minutes, 0, 0);
    }
    
    const newEnd = new Date(newStart.getTime() + duration);
    this.calendarService.moveEvent(this.draggedEvent.uuid, newStart, newEnd).subscribe();
  }

  onDragEnd(event: DragEvent): void {
    this.draggedEvent = null;
    this.draggedOverHour = null;
    this.draggedOverMinutes = 0;
    this.dropPreview.set(null);
  }

  formatDropTime(): string {
    if (this.draggedOverHour === null) return '';
    
    const date = new Date();
    date.setHours(this.draggedOverHour, this.draggedOverMinutes, 0, 0);
    return formatTime(date);
  }

  onDragOver(event: DragEvent, hour: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    
    // If we're hovering over an event, use its start time
    if (this.hoveredEventId && this.draggedEvent && !this.draggedEvent.allDay) {
      const hoveredEvent = this.timedEvents().find(e => e.uuid === this.hoveredEventId);
      if (hoveredEvent) {
        const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
        const previewStart = new Date(hoveredEvent.start);
        const previewEnd = new Date(previewStart.getTime() + duration);
        
        this.draggedOverHour = previewStart.getHours();
        this.draggedOverMinutes = previewStart.getMinutes();
        
        this.dropPreview.set({
          start: previewStart,
          end: previewEnd
        });
        return;
      }
    }
    
    // Calculate the position within the hour slot
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const slotHeight = rect.height;
    
    const time = getTimeFromMousePosition(hour, offsetY, slotHeight);
    this.draggedOverHour = time.hour;
    this.draggedOverMinutes = time.minutes;

    // Update drop preview if dragging a timed event
    if (this.draggedEvent && !this.draggedEvent.allDay) {
      const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
      const date = this.currentDate();
      const previewStart = new Date(date);
      previewStart.setHours(time.hour, time.minutes, 0, 0);
      const previewEnd = new Date(previewStart.getTime() + duration);
      
      this.dropPreview.set({
        start: previewStart,
        end: previewEnd
      });
    }
  }

  onDragLeave(event: DragEvent): void {
    this.draggedOverHour = null;
    this.draggedOverMinutes = 0;
    this.dropPreview.set(null);
  }

  onDrop(event: DragEvent, hour: number): void {
    event.preventDefault();
    
    if (this.draggedEvent && !this.draggedEvent.allDay) {
      const duration = this.draggedEvent.end.getTime() - this.draggedEvent.start.getTime();
      let newStart: Date;
      
      // Check if we're dropping over an existing event
      if (this.hoveredEventId) {
        // Find the hovered event and use its start time
        const hoveredEvent = this.timedEvents().find(e => e.uuid === this.hoveredEventId);
        if (hoveredEvent) {
          newStart = new Date(hoveredEvent.start);
        } else {
          // Fallback to calculated position
          const target = event.currentTarget as HTMLElement;
          const rect = target.getBoundingClientRect();
          const offsetY = event.clientY - rect.top;
          const slotHeight = rect.height;
          
          const time = getTimeFromMousePosition(hour, offsetY, slotHeight);
          const date = this.currentDate();
          newStart = new Date(date);
          newStart.setHours(time.hour, time.minutes, 0, 0);
        }
      } else {
        // Calculate the exact drop position
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const offsetY = event.clientY - rect.top;
        const slotHeight = rect.height;
        
        const time = getTimeFromMousePosition(hour, offsetY, slotHeight);
        const date = this.currentDate();
        newStart = new Date(date);
        newStart.setHours(time.hour, time.minutes, 0, 0);
      }
      
      const newEnd = new Date(newStart.getTime() + duration);
      this.calendarService.moveEvent(this.draggedEvent.uuid, newStart, newEnd).subscribe();
    }
    
    this.draggedEvent = null;
    this.draggedOverHour = null;
    this.draggedOverMinutes = 0;
    this.dropPreview.set(null);
    this.hoveredEventId = null;
  }

  onAllDayDrop(event: DragEvent): void {
    event.preventDefault();
    
    if (this.draggedEvent && !this.draggedEvent.allDay) {
      // Convert to all-day event
      const date = this.currentDate();
      const newStart = new Date(date);
      newStart.setHours(0, 0, 0, 0);
      
      const newEnd = new Date(date);
      newEnd.setHours(23, 59, 59, 999);
      
      this.calendarService.updateEvent(this.draggedEvent.uuid, {
        start: newStart,
        end: newEnd,
        allDay: true
      }).subscribe();
    }
    
    this.draggedEvent = null;
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
  }
}
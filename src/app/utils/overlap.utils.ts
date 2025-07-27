import { CalendarEvent } from '../models/calendar-event.model';

export interface EventPosition {
  event: CalendarEvent;
  left: number;
  width: number;
  column: number;
  totalColumns: number;
}

export function calculateEventPositions(events: CalendarEvent[]): EventPosition[] {
  if (events.length === 0) return [];
  
  // Sort events by start time, then by duration (longer events first)
  const sortedEvents = [...events].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
  });

  // Group overlapping events
  const groups = groupOverlappingEvents(sortedEvents);
  const positions: EventPosition[] = [];

  // Process each group independently
  for (const group of groups) {
    const groupPositions = calculateGroupPositions(group);
    positions.push(...groupPositions);
  }

  return positions;
}

function calculateGroupPositions(events: CalendarEvent[]): EventPosition[] {
  if (events.length === 0) return [];
  
  const positions: EventPosition[] = [];
  const columns: { event: CalendarEvent; endTime: number }[][] = [];

  // Sort events by start time, then by duration
  const sortedEvents = [...events].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
  });

  for (const event of sortedEvents) {
    let columnIndex = -1;
    let minEndTime = Infinity;

    // Find the leftmost column where this event can fit
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const lastEvent = column[column.length - 1];
      
      // Check if the event can fit in this column
      if (lastEvent.endTime <= event.start.getTime()) {
        columnIndex = i;
        break;
      }
    }

    // If no suitable column found, create a new one
    if (columnIndex === -1) {
      columnIndex = columns.length;
      columns.push([]);
    }

    // Add event to the column
    columns[columnIndex].push({
      event,
      endTime: event.end.getTime()
    });
  }

  // Now calculate positions with space-filling logic
  for (let i = 0; i < columns.length; i++) {
    for (const item of columns[i]) {
      const event = item.event;
      
      // Find how many columns this event can span
      let spanColumns = 1;
      let canExpand = true;
      
      // Check if we can expand to the right
      for (let j = i + 1; j < columns.length && canExpand; j++) {
        // Check if this event overlaps with any event in column j
        const overlapsInColumn = columns[j].some(other => 
          eventsOverlap(event, other.event)
        );
        
        if (!overlapsInColumn) {
          spanColumns++;
        } else {
          canExpand = false;
        }
      }

      // Calculate the actual width and position
      const totalColumns = columns.length;
      const columnWidth = 100 / totalColumns;
      
      positions.push({
        event,
        column: i,
        totalColumns: totalColumns,
        left: i * columnWidth,
        width: columnWidth * spanColumns
      });
    }
  }

  return positions;
}

function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  return event1.start < event2.end && event2.start < event1.end;
}

export function groupOverlappingEvents(events: CalendarEvent[]): CalendarEvent[][] {
  if (events.length === 0) return [];

  const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const groups: CalendarEvent[][] = [];
  
  for (const event of sortedEvents) {
    const overlappingGroups: number[] = [];
    
    // Find all groups that this event overlaps with
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const overlapsWithGroup = group.some(groupEvent => eventsOverlap(event, groupEvent));
      
      if (overlapsWithGroup) {
        overlappingGroups.push(i);
      }
    }
    
    if (overlappingGroups.length === 0) {
      // No overlap with any group, create a new group
      groups.push([event]);
    } else if (overlappingGroups.length === 1) {
      // Overlaps with one group, add to that group
      groups[overlappingGroups[0]].push(event);
    } else {
      // Overlaps with multiple groups, merge them
      const mergedGroup = [event];
      
      // Collect all events from overlapping groups (in reverse order to avoid index issues)
      for (let i = overlappingGroups.length - 1; i >= 0; i--) {
        const groupIndex = overlappingGroups[i];
        mergedGroup.push(...groups[groupIndex]);
        groups.splice(groupIndex, 1);
      }
      
      // Add the merged group
      groups.push(mergedGroup);
    }
  }
  
  return groups;
}

export interface DropPreviewEvent {
  start: Date;
  end: Date;
}

export function calculateEventPositionsWithPreview(
  events: CalendarEvent[], 
  previewEvent: DropPreviewEvent | null
): EventPosition[] {
  if (!previewEvent) {
    return calculateEventPositions(events);
  }

  // Create a temporary event for the preview
  const tempEvent: CalendarEvent = {
    uuid: '__preview__',
    title: 'Preview',
    start: previewEvent.start,
    end: previewEvent.end,
    allDay: false,
    color: 'transparent'
  };

  // Calculate positions including the preview event
  const allEvents = [...events, tempEvent];
  const positions = calculateEventPositions(allEvents);

  // Remove the preview event from the results but keep the positions adjusted
  return positions.filter(p => p.event.uuid !== '__preview__');
}
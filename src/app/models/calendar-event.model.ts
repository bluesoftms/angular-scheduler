export interface CalendarEvent {
  uuid: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color?: string;
  location?: string;
  attendees?: string[];
}

export type ViewType = 'day' | 'week' | 'month';

export interface CalendarViewState {
  currentDate: Date;
  viewType: ViewType;
  events: CalendarEvent[];
}
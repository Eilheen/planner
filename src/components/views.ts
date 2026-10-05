import { CalendarDays, ListTodo, Sun } from 'lucide-react';
import type { View } from '@/types';

export const VIEWS: { id: View; label: string; Icon: typeof Sun }[] = [
  { id: 'day', label: 'День', Icon: Sun },
  { id: 'week', label: 'Неделя', Icon: CalendarDays },
  { id: 'tasks', label: 'Задачи', Icon: ListTodo },
];

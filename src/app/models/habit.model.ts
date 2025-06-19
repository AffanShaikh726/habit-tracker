export interface Habit {
  id?: string;
  userId: string;
  name: string;
  color: string;
  createdAt: Date;
  lastCompleted?: Date;
  currentStreak: number;
  bestStreak: number;
  completions: HabitCompletion[];
}

export interface HabitCompletion {
  date: Date;
  completed: boolean;
}

export interface HabitStats {
  totalHabits: number;
  totalCompletions: number;
  avgSuccessRate: number;
  bestStreak: number;
}

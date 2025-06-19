import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, NgClass, NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/header.component';
import { HabitService } from '../../services/habit.service';
import { AuthService } from '../../services/auth.service';
import { Habit } from '../../models/habit.model';
import { Observable, of, switchMap, take, map } from 'rxjs';

type Theme = 'light' | 'dark';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, NgClass, NgStyle],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss'
})
export class StatisticsComponent implements OnInit {
  habits$!: Observable<Habit[]>;
  selectedHabit: Habit | null = null;
  currentDate = new Date();
  weeklyData$: Observable<{date: Date, completed: boolean, color?: string}[]> = of([]);
  stats$: Observable<{habitSuccessRate: number, avgSuccessRate: number, completedDays: number, totalDays: number}> = of({
    habitSuccessRate: 0,
    avgSuccessRate: 0,
    completedDays: 0,
    totalDays: 0
  });
  
  currentTheme: Theme = 'light';
  isThemeMenuOpen = false;
  themes: Theme[] = ['light', 'dark'];
  themeIcons = {
    light: '☀️',
    dark: '🌙',
  };
  
  // Alert properties
  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' = 'success';
  
  private habitService = inject(HabitService);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    // Get the current theme from localStorage or use default
    const savedTheme = localStorage.getItem('theme') as Theme || 'light';
    this.setTheme(savedTheme);
  }
  
  ngOnInit(): void {
    this.habits$ = this.habitService.habits$;
    
    // Calculate statistics
    this.stats$ = this.habits$.pipe(
      map(habits => this.calculateStats(habits))
    );
    
    this.habits$.subscribe(habits => {
      if (habits.length > 0 && !this.selectedHabit) {
        this.selectHabit(habits[0]);
      }
    });
  }

  onLogout() {
    this.authService.signOut().catch((error: Error) => {
      console.error('Error signing out:', error);
    });
  }
  
  selectHabit(habit: Habit): void {
    // Update the selected habit with the latest data from the habits$ observable
    this.habits$.pipe(take(1)).subscribe((habits: Habit[]) => {
      const updatedHabit = habits.find((h: Habit) => h.id === habit.id);
      if (updatedHabit) {
        this.selectedHabit = updatedHabit;
        this.loadWeeklyData();
        
        // Update stats with the new selected habit
        this.stats$ = of(this.calculateStats(habits));
      }
    });
  }
  
  loadWeeklyData(): void {
    if (!this.selectedHabit) return;
    
    // Get the start of the current week (Sunday)
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    
    // Create a new observable that will update when the habits change
    this.weeklyData$ = this.habits$.pipe(
      switchMap((habits: Habit[]) => {
        const currentHabit = habits.find((h: Habit) => h.id === this.selectedHabit?.id);
        if (!currentHabit) return of([]);
        
        return this.habitService.getWeeklyData(currentHabit, startOfWeek).pipe(
          map(weekData => {
            // Add the habit's color to each day's data
            return weekData.map(day => ({
              ...day,
              color: currentHabit.color
            }));
          })
        );
      })
    );
  }
  
  previousWeek(): void {
    const newDate = new Date(this.currentDate);
    newDate.setDate(this.currentDate.getDate() - 7);
    this.currentDate = newDate;
    this.loadWeeklyData();
  }
  
  nextWeek(): void {
    const newDate = new Date(this.currentDate);
    newDate.setDate(this.currentDate.getDate() + 7);
    this.currentDate = newDate;
    this.loadWeeklyData();
  }
  
  goToToday(): void {
    this.currentDate = new Date();
    this.loadWeeklyData();
  }
  
  getHabitSuccessRate(habit: Habit): number {
    if (!habit.createdAt) return 0;
    
    const created = new Date(habit.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalDays = Math.max(1, Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    const completedDays = (habit.completions || []).filter(c => c.completed).length;
    
    return Math.round((completedDays / totalDays) * 100);
  }
  
  getCompletedDays(habit: Habit): number {
    return (habit.completions || []).filter(c => c.completed).length;
  }
  
  getTotalDays(habit: Habit): number {
    if (!habit.createdAt) return 0;
    const created = new Date(habit.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(1, Math.ceil((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
  }
  
  private calculateStats(habits: Habit[]): {habitSuccessRate: number, avgSuccessRate: number, completedDays: number, totalDays: number} {
    if (!this.selectedHabit || habits.length === 0) {
      return { habitSuccessRate: 0, avgSuccessRate: 0, completedDays: 0, totalDays: 0 };
    }
    
    // Calculate selected habit's success rate
    const habitSuccessRate = this.getHabitSuccessRate(this.selectedHabit) || 0;
    const completedDays = this.getCompletedDays(this.selectedHabit) || 0;
    const totalDays = this.getTotalDays(this.selectedHabit) || 0;
    
    // Calculate average success rate across all habits
    const avgSuccessRate = habits.length > 0 
      ? Math.round(habits.reduce((sum, h) => sum + (this.getHabitSuccessRate(h) || 0), 0) / habits.length)
      : 0;
    
    return { 
      habitSuccessRate: Math.min(100, Math.max(0, habitSuccessRate)),
      avgSuccessRate: Math.min(100, Math.max(0, avgSuccessRate)),
      completedDays: Math.max(0, completedDays),
      totalDays: Math.max(1, totalDays)
    };
  }
  
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  toggleThemeMenu() {
    this.isThemeMenuOpen = !this.isThemeMenuOpen;
  }

  setTheme(theme: Theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.isThemeMenuOpen = false;
  }
  
  // Helper method to count completed days in weekly data
  getCompletedDaysCount(weekData: {date: Date, completed: boolean}[]): number {
    if (!weekData) return 0;
    return weekData.filter(d => d.completed).length;
  }

  // Check if a date is today
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  // Toggle habit completion for a specific date
  toggleDayCompletion(day: {date: Date, completed: boolean}): void {
    // Only allow toggling for today's date
    if (!this.selectedHabit || !this.isToday(day.date)) return;
    
    this.habitService.toggleHabitCompletion(this.selectedHabit, day.date)
      .then(() => {
        // Toggle the local state for immediate UI feedback
        day.completed = !day.completed;
        
        // Show success alert
        if (this.selectedHabit) {
          this.alertMessage = day.completed 
            ? `Marked ${this.selectedHabit.name} as complete for today!` 
            : `Marked ${this.selectedHabit.name} as incomplete for today.`;
        } else {
          this.alertMessage = day.completed 
            ? 'Marked as complete for today!' 
            : 'Marked as incomplete for today.';
        }
        this.alertType = 'success';
        this.showAlert = true;
        
        // Hide alert after 3 seconds
        setTimeout(() => {
          this.showAlert = false;
        }, 3000);
      })
      .catch(error => {
        console.error('Error toggling habit completion:', error);
        this.alertMessage = 'Failed to update habit. Please try again.';
        this.alertType = 'error';
        this.showAlert = true;
        
        // Hide alert after 3 seconds
        setTimeout(() => {
          this.showAlert = false;
        }, 3000);
      });
  }
}

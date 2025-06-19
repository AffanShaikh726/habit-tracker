import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/header.component';
import { HabitService } from '../../services/habit.service';
import { AuthService } from '../../services/auth.service';
import { Habit, HabitStats } from '../../models/habit.model';
import { Observable } from 'rxjs';

type Theme = 'light' | 'dark';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  habits$!: Observable<Habit[]>;
  stats$!: Observable<HabitStats>;
  activeTab: 'tracker' | 'statistics' | 'manage' = 'tracker';
  currentTheme: Theme = 'light';
  isThemeMenuOpen = false;
  themes: Theme[] = ['light', 'dark'];
  themeIcons = {
    light: '☀️',
    dark: '🌙',
  };
  
  private authService = inject(AuthService);
  private router = inject(Router);
  
  constructor(
    private habitService: HabitService,
    private cdr: ChangeDetectorRef
  ) {}
  
  onLogout() {
    this.authService.signOut().catch(error => {
      console.error('Error signing out:', error);
    });
  }
  
  ngOnInit(): void {
    this.habits$ = this.habitService.getHabitsByDate(new Date());
    this.stats$ = this.habitService.stats$;
    this.loadTheme();
  }
  
  setActiveTab(tab: 'tracker' | 'statistics' | 'manage'): void {
    this.activeTab = tab;
  }

  toggleThemeMenu() {
    this.isThemeMenuOpen = !this.isThemeMenuOpen;
  }

  setTheme(theme: Theme) {
    if (this.currentTheme !== theme) {
      this.currentTheme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      
      // Update the HTML class to ensure proper theming
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme);
      
      this.cdr.detectChanges();
    }
    this.isThemeMenuOpen = false;
  }
  
  loadTheme() {
    const storedTheme = localStorage.getItem('theme');
    const theme = storedTheme || 'light';
    this.currentTheme = theme as Theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
  
  // Helper methods to avoid arrow functions in templates
  getCompletionPercentage(habit: Habit): number {
    if (!habit.completions || habit.completions.length === 0) {
      return 0;
    }
    const completedCount = habit.completions.filter(c => c.completed).length;
    return (completedCount / habit.completions.length) * 100;
  }
  
  hasStreak(habit: Habit, minStreak: number): boolean {
    return habit.currentStreak >= minStreak;
  }
}

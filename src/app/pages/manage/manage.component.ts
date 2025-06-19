import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/header.component';
import { HabitService } from '../../services/habit.service';
import { AuthService } from '../../services/auth.service';
import { Habit } from '../../models/habit.model';

type Theme = 'light' | 'dark';

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HeaderComponent],
  templateUrl: './manage.component.html',
  styleUrl: './manage.component.scss'
})
export class ManageComponent implements OnInit {
  habits: Habit[] = [];
  newHabit = {
    name: '',
    color: ''
  };
  
  // Toast state
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  
  // Delete confirmation modal state
  showDeleteModal = false;
  habitToDelete: { id: string, name: string } | null = null;
  availableColors = [
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' }
  ];
  
  currentTheme: Theme = 'light';
  isThemeMenuOpen = false;
  themes: Theme[] = ['light', 'dark'];
  themeIcons = {
    light: '☀️',
    dark: '🌙',
  };
  
  private habitService = inject(HabitService);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    // Get the current theme from localStorage or use default
    const savedTheme = localStorage.getItem('theme') as Theme || 'light';
    this.setTheme(savedTheme);
  }
  
  ngOnInit(): void {
    this.habitService.habits$.subscribe(habits => {
      this.habits = habits;
    });
  }

  onLogout() {
    this.authService.signOut().catch((error: Error) => {
      console.error('Error signing out:', error);
    });
  }
  
  getRandomColor(): string {
    const randomIndex = Math.floor(Math.random() * this.availableColors.length);
    return this.availableColors[randomIndex].value;
  }

  createHabit(): void {
    if (!this.newHabit.name.trim()) return;
    
    // Use selected color or get a random one if none selected
    const color = this.newHabit.color || this.getRandomColor();
    
    this.habitService.createHabit({
      name: this.newHabit.name.trim(),
      color: color,
      createdAt: new Date()
    }).then(() => {
      // Show success toast
      this.showToastMessage(`Habit "${this.newHabit.name.trim()}" created successfully!`, 'success');
      
      // Reset form
      this.newHabit = {
        name: '',
        color: 'green'
      };
    }).catch(error => {
      console.error('Error creating habit:', error);
      this.showToastMessage('Failed to create habit. Please try again.', 'error');
    });
  }
  
  private showToastMessage(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
  
  confirmDelete(habit: Habit): void {
    if (!habit.id) return;
    this.habitToDelete = { id: habit.id, name: habit.name };
    this.showDeleteModal = true;
  }
  
  deleteHabit(): void {
    if (!this.habitToDelete) return;
    
    const habitName = this.habitToDelete.name;
    this.habitService.deleteHabit(this.habitToDelete.id)
      .then(() => {
        this.showToastMessage(`Habit "${habitName}" deleted successfully!`, 'success');
      })
      .catch(error => {
        console.error('Error deleting habit:', error);
        this.showToastMessage('Failed to delete habit. Please try again.', 'error');
      })
      .finally(() => {
        this.showDeleteModal = false;
        this.habitToDelete = null;
      });
  }
  
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.habitToDelete = null;
  }
  
  selectColor(color: string): void {
    this.newHabit.color = color;
  }

  toggleThemeMenu(): void {
    this.isThemeMenuOpen = !this.isThemeMenuOpen;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.isThemeMenuOpen = false;
  }
}

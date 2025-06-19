import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-base-100 transition-colors duration-200">
      <div class="w-full max-w-2xl space-y-8 bg-base-200 p-8 rounded-lg shadow-lg">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create a new account
          </h2>
        </div>
        <form id="signupForm" (ngSubmit)="onSubmit()" #signupForm="ngForm" class="mt-8 space-y-6">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                autocomplete="email" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="you@example.com"
                [(ngModel)]="credentials.email"
                [disabled]="loading">
            </div>
          </div>
          
          <!-- Password Input -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div class="mt-1">
              <input 
                id="password" 
                name="password" 
                type="password" 
                autocomplete="new-password" 
                required 
                minlength="6"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="••••••••"
                [(ngModel)]="credentials.password"
                [disabled]="loading">
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Password must be at least 6 characters long</p>
          </div>
          
          <!-- Confirm Password -->
          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <div class="mt-1">
              <input 
                id="confirmPassword" 
                name="confirmPassword" 
                type="password" 
                autocomplete="new-password" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm text-gray-900 dark:text-white dark:bg-gray-800"
                placeholder="••••••••"
                [(ngModel)]="credentials.confirmPassword"
                [disabled]="loading">
            </div>
          </div>
          
          <!-- Submit Button -->
          <div>
            <button 
              type="submit" 
              [disabled]="loading || !signupForm.form.valid || credentials.password !== credentials.confirmPassword"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-700 dark:hover:bg-indigo-600 dark:focus:ring-indigo-600 dark:focus:ring-offset-gray-900">
              <span *ngIf="loading" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
              <span *ngIf="!loading">Create Account</span>
            </button>
          </div>
        
        <div class="mt-6 text-center bg-base-100 dark:bg-base-200 p-4 rounded-lg transition-colors duration-200">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Already have an account? 
            <a [routerLink]="['/login']" class="ml-1 font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200">
              Sign in
            </a>
          </p>
        </div>
      
    
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class SignupComponent {
  credentials = {
    email: '',
    password: '',
    confirmPassword: ''
  };
  loading = false;
  error: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  async onSubmit() {
    if (this.credentials.password !== this.credentials.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (this.credentials.password.length < 6) {
      this.error = 'Password must be at least 6 characters long';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      await this.authService.signUp(this.credentials.email, this.credentials.password);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/email-already-in-use') {
        this.error = 'An account with this email already exists. Please use a different email or sign in.';
      } else if (error.code === 'auth/invalid-email') {
        this.error = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        this.error = 'Password is too weak. Please choose a stronger password.';
      } else {
        this.error = 'Failed to create account. Please try again later.';
      }
    } finally {
      this.loading = false;
    }
  }
}

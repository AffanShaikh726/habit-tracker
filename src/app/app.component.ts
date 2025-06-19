import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationStart, NavigationEnd, NavigationError, Event as NavigationEvent } from '@angular/router';
import { CommonModule, ViewportScroller } from '@angular/common';
import { AuthService } from './services/auth.service';
import { HeaderComponent } from './components/header/header.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    CommonModule, 
    HeaderComponent, 
    RouterLink,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Habit Tracker';
  isLoggedIn = false;
  currentYear = new Date().getFullYear();
  private authSubscription: Subscription = new Subscription();
  private routerSubscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
    private viewportScroller: ViewportScroller
  ) {
    // Handle scroll to anchor on route changes
    this.router.events.subscribe((event: NavigationEvent) => {
      if (event instanceof NavigationEnd) {
        const urlTree = this.router.parseUrl(event.url);
        if (urlTree.fragment) {
          // Use setTimeout to ensure the view is updated before scrolling
          setTimeout(() => {
            this.viewportScroller.scrollToAnchor(urlTree.fragment!);
          }, 0);
        }
      }
    });
  }

  ngOnInit() {
    console.log('AppComponent: Initializing...');
    
    // Subscribe to authentication state changes
    this.authSubscription = this.authService.user$.subscribe({
      next: (user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');
        this.isLoggedIn = !!user;
      },
      error: (err) => {
        console.error('Error in auth state:', err);
        this.isLoggedIn = false;
      }
    });

    // Subscribe to router events for debugging
    this.routerSubscription = this.router.events.subscribe((event: NavigationEvent) => {
      if (event instanceof NavigationStart) {
        console.log('Navigation Start:', event.url);
      }
      if (event instanceof NavigationEnd) {
        console.log('Navigation End:', event.url);
      }
      if (event instanceof NavigationError) {
        console.error('Navigation Error:', event.error);
      }
    });
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  smoothScrollToSignup(event: any) {
    event.preventDefault();
    const signupForm = document.querySelector('#signupForm');
    if (signupForm) {
      signupForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

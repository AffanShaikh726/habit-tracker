import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // First check if auth is initialized
  return authService.isInitialized$.pipe(
    take(1),
    switchMap(initialized => {
      if (!initialized) {
        // If not initialized yet, wait for initialization
        return of(false);
      }
      
      // After initialization, check user state
      return authService.user$.pipe(
        take(1),
        map(user => {
          if (user) {
            return true;
          }
          // If no user, redirect to login
          console.log('AuthGuard: User not authenticated, redirecting to login');
          router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url },
            queryParamsHandling: 'merge'
          });
          return false;
        })
      );
    })
  );
};

export const unauthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.user$.pipe(
    take(1),
    switchMap(user => {
      if (!user) {
        return of(true);
      } else {
        console.log('UnauthGuard: User already authenticated, redirecting to dashboard');
        router.navigate(['/dashboard']);
        return of(false);
      }
    })
  );
};

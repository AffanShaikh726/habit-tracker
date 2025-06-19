import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, UserCredential, User, onAuthStateChanged } from '@angular/fire/auth';
import { BehaviorSubject, Observable, from, of, ReplaySubject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private user = new BehaviorSubject<User | null>(null);
  private initialized = new ReplaySubject<boolean>(1);
  user$ = this.user.asObservable();
  isLoggedIn$: Observable<boolean>;
  isInitialized$ = this.initialized.asObservable();

  constructor(private auth: Auth, private router: Router) {
    // Set up auth state observer
    onAuthStateChanged(this.auth, (user) => {
      this.user.next(user);
      // Mark as initialized after first auth state change
      if (!this.initialized.closed) {
        this.initialized.next(true);
        this.initialized.complete();
      }
    }, (error) => {
      console.error('Auth state error:', error);
      this.initialized.next(true);
      this.initialized.complete();
    });

    // Create isLoggedIn$ observable
    this.isLoggedIn$ = this.user.pipe(
      map(user => !!user)
    );
  }

  // Sign up with email/password
  signUp(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      console.log('Attempting to sign in with email:', email);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('Sign in successful');
      return userCredential;
    } catch (error: any) {
      console.error('Sign in error:', error);
      let errorMessage = 'Failed to sign in. Please check your credentials.';
      
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      } else if (error?.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error?.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      }
      
      throw new Error(errorMessage);
    }
  }

  // Sign out
  signOut(): Promise<void> {
    return signOut(this.auth);
  }

  // Get current user synchronously
  // Get current user
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}

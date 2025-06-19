import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: ``,
  styles: []
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  userEmail$ = this.authService.user$.pipe(
    map(user => user?.email || '')
  );

  constructor() {}

  ngOnInit(): void {}

  onLogout() {
    this.authService.signOut().catch(error => {
      console.error('Error signing out:', error);
    });
  }
}

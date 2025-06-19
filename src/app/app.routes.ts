import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { StatisticsComponent } from './pages/statistics/statistics.component';
import { ManageComponent } from './pages/manage/manage.component';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { authGuard, unauthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'dashboard', 
    pathMatch: 'full' 
  },
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [unauthGuard],
    data: { title: 'Login' }
  },
  { 
    path: 'signup', 
    component: SignupComponent,
    canActivate: [unauthGuard],
    data: { title: 'Sign Up' }
  },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [authGuard],
    data: { title: 'Dashboard' }
  },
  { 
    path: 'statistics', 
    component: StatisticsComponent,
    canActivate: [authGuard],
    data: { title: 'Statistics' }
  },
  { 
    path: 'manage', 
    component: ManageComponent,
    canActivate: [authGuard],
    data: { title: 'Manage Habits' }
  },
  { 
    path: '**', 
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];

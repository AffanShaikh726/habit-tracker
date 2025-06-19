import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withDebugTracing, withRouterConfig, withInMemoryScrolling } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

// Router configuration with debugging
const routerProviders = [
  provideRouter(
    routes,
    withDebugTracing(),
    withRouterConfig({
      onSameUrlNavigation: 'reload',
      paramsInheritanceStrategy: 'always'
    }),
    withInMemoryScrolling({
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled'
    })
  )
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ 
      eventCoalescing: true,
      runCoalescing: true
    }), 
    ...routerProviders,
    provideFirebaseApp(() => {
      console.log('Initializing Firebase...');
      return initializeApp(environment.firebase);
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      console.log('Firestore initialized');
      return firestore;
    }),
    provideAuth(() => {
      const auth = getAuth();
      console.log('Firebase Auth initialized');
      return auth;
    }),
    provideAnimations()
  ]
};

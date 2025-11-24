import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideZoneChangeDetection } from '@angular/core';
import 'zone.js';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true })
  ]
}).catch(err => console.error(err));

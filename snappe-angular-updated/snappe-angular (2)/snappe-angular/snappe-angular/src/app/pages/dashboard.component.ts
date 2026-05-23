import { AfterViewInit, Component } from '@angular/core';
import { Router } from '@angular/router';

declare global {
  interface Window {
    startDashboardApp?: () => void;
  }
}

declare const getSession: (() => unknown) | undefined;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit {
  constructor(private readonly router: Router) {}

  ngAfterViewInit(): void {
    const user = typeof getSession === 'function' ? getSession() : null;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    setTimeout(() => {
      if (typeof window.startDashboardApp === 'function') {
        window.startDashboardApp();
      }
    });
  }
}

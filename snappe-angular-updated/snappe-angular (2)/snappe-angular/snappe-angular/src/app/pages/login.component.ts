import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

declare const initUsers: (() => void) | undefined;
declare const login: ((username: string, password: string) => unknown) | undefined;
declare const setSession: ((user: unknown) => void) | undefined;
declare const getSession: (() => unknown) | undefined;
declare const getUsers: (() => any[]) | undefined;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  errorMsg = '';
  demoUsers: Array<any> = [];

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    if (typeof initUsers === 'function') {
      initUsers();
    }

    const existing = typeof getSession === 'function' ? getSession() : null;
    if (existing) {
      this.router.navigate(['/dashboard']);
    }

    if (typeof getUsers === 'function') {
      try {
        this.demoUsers = (getUsers() || []).slice(0, 10);
      } catch (e) {
        this.demoUsers = [];
      }
    }
  }

  fillCredentials(username: string, password: string): void {
    this.username = username;
    this.password = password;
    this.errorMsg = '';
  }

  onLogin(): void {
    const userName = this.username.trim();
    if (!userName || !this.password) {
      this.errorMsg = 'Please enter both username and password.';
      return;
    }

    const user = typeof login === 'function' ? login(userName, this.password) : null;
    if (!user) {
      this.errorMsg = 'Wrong username or password.';
      this.password = '';
      return;
    }

    if (typeof setSession === 'function') {
      setSession(user);
    }
    this.errorMsg = '';
    this.router.navigate(['/dashboard']);
  }
}

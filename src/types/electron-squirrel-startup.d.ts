import { App } from 'electron';

declare module 'electron' {
  interface App {
    quitting?: boolean;
  }
}

declare module 'electron-squirrel-startup'; 
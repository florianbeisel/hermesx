/* eslint-disable */
import { App } from 'electron';

declare module 'electron' {
  interface App {
    quitting?: boolean;
    isPackaged?: boolean;
  }
}

declare module 'electron-squirrel-startup' {
  function handleSquirrelEvent(): boolean;
  export = handleSquirrelEvent;
}

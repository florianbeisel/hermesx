declare module 'update-electron-app' {
    interface Options {
        repo?: string;
        updateInterval?: string;
        logger?: Console;
    }
    
    function updateElectronApp(options?: Options): void;
    export default updateElectronApp;
} 
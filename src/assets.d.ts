// Add TypeScript declarations for assets
declare module '*.png' {
    const content: string;
    export default content;
}

declare module '*.ico' {
    const content: string;
    export default content;
}

declare module '*.icns' {
    const content: string;
    export default content;
}

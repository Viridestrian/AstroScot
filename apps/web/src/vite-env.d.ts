/// <reference types="vite/client" />

declare module 'react' {
  export const StrictMode: (props: { children?: unknown }) => unknown;
}

declare module 'react-dom/client' {
  export interface Root {
    render(children: unknown): void;
  }

  export function createRoot(container: HTMLElement): Root;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}

export {};

declare global {
  interface Window {
    tidioChatApi?: {
      open: () => void;
      close?: () => void;
      hide?: () => void;
      show?: () => void;
    };
  }
}

import type { SelvedgeApi } from '@selvedge/contracts';
declare global {
  interface Window {
    readonly selvedge: SelvedgeApi;
  }
}

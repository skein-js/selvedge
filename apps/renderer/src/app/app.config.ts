import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideOptimus } from '@openng/optimus-ui/config';
import { definePreset } from '@openng/optimus-ui-themes';
import Aura from '@openng/optimus-ui-themes/aura';

const primary = {
  color: 'var(--selvedge-accent)',
  contrastColor: 'var(--selvedge-on-accent)',
  hoverColor: 'var(--selvedge-accent-hover)',
  activeColor: 'var(--selvedge-accent-active)',
};
const preset = definePreset(Aura, {
  semantic: { colorScheme: { light: { primary }, dark: { primary } } },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideOptimus({ theme: { preset, options: { darkModeSelector: 'system' } } }),
  ],
};

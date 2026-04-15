import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import { createAppI18n } from '../src/ui/i18n'
import '../src/ui/fonts.css'
import '../src/ui/style.css'

setup((app) => {
  // What: register the shared application i18n plugin in Storybook previews. Why: InstallModal and other local-first UI components call useI18n() and must render with the same locale wiring as the production shell.
  app.use(createAppI18n('pl'))
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  }
}

export default preview

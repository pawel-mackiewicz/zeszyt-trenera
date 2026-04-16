import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import {
  APP_DEFAULT_LOCALE,
  APP_LOCALES,
  createAppI18n,
  type AppLocale
} from '../src/ui/i18n'
import '../src/ui/fonts.css'
import '../src/ui/style.css'

const storybookI18n = createAppI18n(APP_DEFAULT_LOCALE)

setup((app) => {
  // What: register one shared i18n instance for all stories. Why: the toolbar-driven locale toggle must update active translations without remounting the entire Storybook app.
  app.use(storybookI18n)
})

function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === 'string' &&
    (APP_LOCALES as readonly string[]).includes(value)
  )
}

const preview: Preview = {
  // What: expose runtime language switching in the Storybook top toolbar. Why: component QA should validate localized copy in both supported app locales without touching source files.
  globalTypes: {
    locale: {
      name: 'Language',
      description: 'App locale used by vue-i18n in previews',
      defaultValue: APP_DEFAULT_LOCALE,
      toolbar: {
        icon: 'globe',
        dynamicTitle: true,
        items: [
          { value: 'pl', title: 'Polski' },
          { value: 'en', title: 'English' }
        ]
      }
    }
  },
  decorators: [
    (story, context) => {
      // What: sync i18n composer locale with Storybook globals. Why: stories that use local i18n blocks should immediately rerender with translated strings after toolbar changes.
      const selectedLocale = context.globals.locale
      storybookI18n.global.locale.value = isAppLocale(selectedLocale)
        ? selectedLocale
        : APP_DEFAULT_LOCALE

      return story()
    }
  ],
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

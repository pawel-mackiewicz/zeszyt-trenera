<script setup lang="ts">
import { computed } from 'vue'

type AppButtonSize = 'default' | 'compact'
type AppButtonVariant = 'primary' | 'secondary'
type AppButtonTag = 'button' | 'router-link'

const props = withDefaults(
  defineProps<{
    as?: AppButtonTag
    disabled?: boolean
    iconOnly?: boolean
    size?: AppButtonSize
    to?: string
    type?: 'button' | 'submit' | 'reset'
    variant?: AppButtonVariant
  }>(),
  {
    as: 'button',
    disabled: false,
    iconOnly: false,
    size: 'default',
    to: '',
    type: 'button',
    variant: 'primary'
  }
)

const emit = defineEmits<{
  (event: 'click', value: MouseEvent): void
}>()

// What: keep one small CTA primitive for the app shell and key mobile-first views. Why: the same visual recipe had already drifted across multiple screens, so interaction changes need one source of truth while each view keeps its own layout rules.
const componentTag = computed(() =>
  props.as === 'router-link' ? 'RouterLink' : 'button'
)
const componentProps = computed(() => {
  if (props.as === 'router-link') {
    return {
      to: props.to ?? '',
      'aria-disabled': props.disabled ? 'true' : undefined,
      tabindex: props.disabled ? -1 : undefined
    }
  }

  return {
    disabled: props.disabled,
    type: props.type
  }
})

function handleClick(event: MouseEvent) {
  if (props.as === 'router-link' && props.disabled) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('click', event)
}
</script>

<template>
  <component
    :is="componentTag"
    class="app-button"
    :class="[
      `app-button--${size}`,
      `app-button--${variant}`,
      {
        'app-button--icon-only': iconOnly
      }
    ]"
    v-bind="componentProps"
    @click="handleClick"
  >
    <slot />
  </component>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-on-surface);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1;
  text-transform: uppercase;
  transition:
    transform 75ms ease,
    box-shadow 75ms ease,
    background-color 75ms ease,
    opacity 75ms ease;
}

.app-button--primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.app-button--secondary {
  background: var(--color-surface);
  color: var(--color-on-surface);
}

/* What: offer a smaller shell-ready button footprint on the shared primitive. Why: header-level actions should inherit the same tactile recipe as full CTAs instead of carrying a second bespoke button implementation. */
.app-button--compact {
  min-height: 2.25rem;
  padding: 0.55rem 0.8rem;
  font-size: 0.62rem;
  letter-spacing: 0.18em;
}

/* What: let icon-triggered CTAs reuse the same shared primitive without inheriting text-button padding. Why: the roster add action and shell icon triggers should stay visually aligned with other CTA states instead of shipping their own square-button clones. */
.app-button--default.app-button--icon-only {
  width: 3rem;
  padding-inline: 0;
}

.app-button--compact.app-button--icon-only {
  width: 2.25rem;
  padding-inline: 0;
}

.app-button:hover:not(:disabled):not([aria-disabled='true']) {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.app-button:active:not(:disabled):not([aria-disabled='true']) {
  transform: scale(0.95);
  box-shadow: none;
}

.app-button:focus-visible {
  outline: 2px solid var(--color-on-surface);
  outline-offset: 3px;
}

.app-button--primary:hover:not(:disabled):not([aria-disabled='true']),
.app-button--primary:focus-visible {
  background: var(--color-surface-tint);
}

.app-button--secondary:hover:not(:disabled):not([aria-disabled='true']),
.app-button--secondary:focus-visible {
  background: var(--color-surface-container-low);
}

.app-button:disabled,
.app-button[aria-disabled='true'] {
  opacity: 0.55;
}

.app-button[aria-disabled='true'] {
  pointer-events: none;
}
</style>

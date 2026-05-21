<script setup lang="ts">
import { useId } from 'vue'

type BaseModalSize = 'lg' | 'xl'
type BaseModalStack = 'default' | 'raised'

const props = withDefaults(
  defineProps<{
    backdropTestId?: string
    size?: BaseModalSize
    stack?: BaseModalStack
    title: string
    visible: boolean
  }>(),
  {
    backdropTestId: '',
    size: 'lg',
    stack: 'default'
  }
)

defineSlots<{
  default(): unknown
  actions?(): unknown
}>()

const emit = defineEmits<{
  close: []
}>()

// What: give every shared modal a stable accessible title connection. Why: feature modals should not each reimplement dialog semantics while sharing the same visual shell.
const titleId = useId()

function emitClose() {
  emit('close')
}
</script>

<template>
  <!-- What: centralize the mobile-first modal layer, backdrop, card, and motion. Why: reset, install, and demo flows were visually identical but had drift-prone duplicate styling. -->
  <Transition name="base-modal-pop">
    <div
      v-if="props.visible"
      class="base-modal"
      :class="[`base-modal--${props.stack}`]"
    >
      <div
        class="base-modal__backdrop"
        :data-testid="props.backdropTestId || undefined"
        aria-hidden="true"
        @click="emitClose"
      ></div>
      <section
        class="base-modal__card"
        :class="[`base-modal__card--${props.size}`]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="base-modal__content">
          <h2 :id="titleId" class="base-modal__title">{{ title }}</h2>
          <slot />
        </div>
        <div v-if="$slots.actions" class="base-modal__actions">
          <slot name="actions" />
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.base-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
}

.base-modal--default {
  z-index: 70;
}

.base-modal--raised {
  z-index: 75;
}

.base-modal__backdrop {
  position: absolute;
  inset: 0;
  padding: 0;
  background: rgba(17, 41, 39, 0.45);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.base-modal__card {
  position: relative;
  display: grid;
  width: 100%;
  gap: 1rem;
  padding: clamp(1.25rem, 4vw, 1.75rem);
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
}

.base-modal__card--lg {
  max-width: 32rem;
}

.base-modal__card--xl {
  max-width: 36rem;
}

.base-modal__content {
  display: grid;
  gap: 1rem;
}

.base-modal__title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(1.6rem, 6vw, 2.3rem);
  line-height: 0.96;
  text-transform: uppercase;
  color: var(--color-primary);
}

:slotted(.base-modal__copy) {
  margin: 0;
  color: var(--color-on-surface);
  line-height: 1.5;
}

.base-modal__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.base-modal-pop-enter-active,
.base-modal-pop-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.base-modal-pop-enter-from,
.base-modal-pop-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@media (min-width: 640px) {
  .base-modal {
    align-items: center;
  }

  .base-modal__actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>

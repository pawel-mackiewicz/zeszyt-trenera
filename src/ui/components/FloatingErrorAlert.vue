<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    dismissible?: boolean
    eyebrow?: string
    message: string
    stackLevel?: 'base' | 'modal'
    title?: string
    topOffset?: 'screen' | 'shell'
  }>(),
  {
    dismissible: true,
    eyebrow: '',
    stackLevel: 'base',
    title: '',
    topOffset: 'shell'
  }
)

const emit = defineEmits<{
  dismiss: []
}>()
const { t } = useI18n({ useScope: 'local' })

const swipeOffsetY = ref(0)
const swipePointerId = ref<number | null>(null)
const swipeStartY = ref(0)
const isDragging = ref(false)
const canDismiss = computed(() => props.dismissible)
const alertStyle = computed(() => ({
  '--floating-error-offset-y': `${swipeOffsetY.value}px`
}))
const SWIPE_DISMISS_THRESHOLD_PX = 96

function resetSwipeState() {
  swipeOffsetY.value = 0
  swipePointerId.value = null
  swipeStartY.value = 0
  isDragging.value = false
}

function dismissAlert() {
  if (!canDismiss.value) {
    return
  }

  resetSwipeState()
  emit('dismiss')
}

function startSwipe(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null

  if (target === null || !canDismiss.value) {
    return
  }

  // What: keep the swipe gesture owned by one active pointer. Why: the alert should dismiss with one deliberate flick on touch devices instead of reacting unpredictably to multiple contacts.
  swipePointerId.value = event.pointerId
  swipeStartY.value = event.clientY
  swipeOffsetY.value = 0
  isDragging.value = true
  target.setPointerCapture?.(event.pointerId)
}

function moveSwipe(event: PointerEvent) {
  if (!canDismiss.value || event.pointerId !== swipePointerId.value) {
    return
  }

  swipeOffsetY.value = Math.min(0, event.clientY - swipeStartY.value)
}

function finishSwipe(
  event: PointerEvent,
  options: { dismissOnThreshold: boolean }
) {
  if (!canDismiss.value || event.pointerId !== swipePointerId.value) {
    return
  }

  const target = event.currentTarget as HTMLElement | null
  const shouldDismiss =
    options.dismissOnThreshold &&
    swipeOffsetY.value <= -SWIPE_DISMISS_THRESHOLD_PX

  target?.releasePointerCapture?.(event.pointerId)

  if (shouldDismiss) {
    dismissAlert()
    return
  }

  resetSwipeState()
}
</script>

<template>
  <section
    class="floating-error-alert fixed inset-x-4 border border-danger bg-surface p-4 text-danger shadow-lg md:left-1/2 md:right-auto md:w-[min(32rem,calc(100%-2rem))]"
    :class="[
      `floating-error-alert--${topOffset}`,
      `floating-error-alert--${stackLevel}`,
      {
        'floating-error-alert--settling': !isDragging
      }
    ]"
    :style="alertStyle"
    aria-live="assertive"
    role="alert"
    @pointerdown="startSwipe"
    @pointermove="moveSwipe"
    @pointerup="finishSwipe($event, { dismissOnThreshold: true })"
    @pointercancel="finishSwipe($event, { dismissOnThreshold: false })"
  >
    <div class="pr-24">
      <p
        v-if="eyebrow"
        class="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-danger"
      >
        {{ eyebrow }}
      </p>
      <p v-if="title" class="mt-1 font-mono text-sm font-bold uppercase">
        {{ title }}
      </p>
      <!-- What: keep every transient error on one reusable floating surface. Why: the app should announce recoverable problems in the same place and with the same gesture contract no matter which screen triggered them. -->
      <p
        class="font-mono text-sm uppercase"
        :class="{
          'mt-2': title || eyebrow
        }"
      >
        {{ message }}
      </p>
    </div>
    <button
      v-if="canDismiss"
      type="button"
      class="absolute right-3 top-3 font-mono text-xs font-bold uppercase tracking-wide text-danger"
      @click="dismissAlert"
      @pointerdown.stop
    >
      {{ t('actions.dismiss') }}
    </button>
  </section>
</template>

<style scoped>
.floating-error-alert {
  transform: translateY(var(--floating-error-offset-y, 0px));
  /* What: reserve the alert surface for the swipe-dismiss gesture. Why: mobile browsers can otherwise treat the upward drag as page panning and starve the shared component of the pointer sequence it needs to dismiss. */
  touch-action: none;
  will-change: transform;
}

.floating-error-alert--screen {
  top: calc(env(safe-area-inset-top, 0px) + 1rem);
}

.floating-error-alert--shell {
  /* What: dock reusable alerts below the fixed shell header. Why: floating errors should stay visible immediately under the navbar instead of colliding with the persistent app chrome. */
  top: calc(env(safe-area-inset-top, 0px) + 5rem);
}

.floating-error-alert--base {
  z-index: 50;
}

.floating-error-alert--modal {
  /* What: lift modal-scoped failures above destructive overlays. Why: when a local-first write fails inside an open modal, the recovery message still has to stay visible and dismissible instead of hiding behind the dialog layer. */
  z-index: 80;
}

.floating-error-alert--settling {
  transition: transform 180ms ease;
}

@media (min-width: 768px) {
  .floating-error-alert {
    transform: translate(-50%, var(--floating-error-offset-y, 0px));
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "dismiss": "Zamknij"
    }
  },
  "en": {
    "actions": {
      "dismiss": "Dismiss"
    }
  }
}
</i18n>

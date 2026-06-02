<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import MemberDetailsBaseDrawer from '@/ui/features/roster/MemberDetailsBaseDrawer.vue'

const props = defineProps<{
  isOpen: boolean
  member: MemberRosterListItem
}>()

const emit = defineEmits<{
  error: [message: string]
  unarchived: [memberId: string]
}>()

const { useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })
const isUnarchivingMember = ref(false)
const memberDisplayName = computed(
  () => `${props.member.firstName} ${props.member.lastName}`
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      resetUnarchiveState()
      emit('error', '')
    }
  }
)

watch(
  () => props.member.id,
  () => {
    resetUnarchiveState()
    emit('error', '')
  }
)

function resetUnarchiveState() {
  isUnarchivingMember.value = false
}

async function unarchiveMember() {
  if (isUnarchivingMember.value) {
    return
  }

  isUnarchivingMember.value = true
  emit('error', '')

  try {
    // What: archived roster restoration goes through the application use case. Why: local-first writes must keep domain events and persistence behind the write layer.
    await useCases.unarchiveMember.handle({
      memberId: props.member.id
    })

    emit('error', '')
    emit('unarchived', props.member.id)
  } catch (error) {
    console.error('Failed to unarchive member from roster details', error)
    emit('error', t('errors.unarchive'))
  } finally {
    resetUnarchiveState()
  }
}
</script>

<template>
  <MemberDetailsBaseDrawer :is-open="isOpen" :member="member">
    <template #actions>
      <AppButton
        data-testid="member-unarchive"
        icon-only
        variant="secondary"
        type="button"
        :aria-label="
          t('actions.unarchive', {
            name: memberDisplayName
          })
        "
        :disabled="isUnarchivingMember"
        :title="
          t('actions.unarchive', {
            name: memberDisplayName
          })
        "
        @click="unarchiveMember"
      >
        <AppIcon name="unarchive" />
      </AppButton>
    </template>
  </MemberDetailsBaseDrawer>
</template>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "unarchive": "Przywróć członka {name}",
      "unarchivePending": "Przywracanie..."
    },
    "errors": {
      "unarchive": "Nie udało się przywrócić członka. Spróbuj ponownie."
    }
  },
  "en": {
    "actions": {
      "unarchive": "Unarchive member {name}",
      "unarchivePending": "Unarchiving..."
    },
    "errors": {
      "unarchive": "The member could not be unarchived. Try again."
    }
  }
}
</i18n>

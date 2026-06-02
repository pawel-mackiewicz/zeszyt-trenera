<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import AppButton from '@/ui/components/AppButton.vue'
import ArchiveIconButton from '@/ui/components/ArchiveIconButton.vue'
import DeleteIconButton from '@/ui/components/DeleteIconButton.vue'
import MemberArchiveConfirmationModal from '@/ui/features/MemberArchiveConfirmationModal.vue'
import MemberDeleteConfirmationModal from '@/ui/features/roster/MemberDeleteConfirmationModal.vue'
import MemberDetailsBaseDrawer from '@/ui/features/roster/MemberDetailsBaseDrawer.vue'
import MemberEditDrawer from '@/ui/features/roster/MemberEditDrawer.vue'

const props = defineProps<{
  isOpen: boolean
  member: MemberRosterListItem
}>()

const emit = defineEmits<{
  deleted: [memberId: string]
  archived: [memberId: string]
  error: [message: string]
  saved: [member: MemberRosterListItem]
}>()

const { t } = useI18n({ useScope: 'local' })
const isEditing = ref(false)
const archiveModalVisible = ref(false)
const deleteModalVisible = ref(false)
const isArchivingMember = ref(false)
const isDeletingMember = ref(false)

const memberDisplayName = computed(
  () => `${props.member.firstName} ${props.member.lastName}`
)
const memberActionDisabled = computed(
  () =>
    isArchivingMember.value ||
    isDeletingMember.value ||
    archiveModalVisible.value ||
    deleteModalVisible.value
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      isEditing.value = false
      resetArchiveState()
      resetDeleteState()
      emit('error', '')
    }
  }
)

watch(
  () => props.member.id,
  () => {
    isEditing.value = false
    resetArchiveState()
    resetDeleteState()
    emit('error', '')
  }
)

function resetArchiveState() {
  archiveModalVisible.value = false
  isArchivingMember.value = false
}

function resetDeleteState() {
  deleteModalVisible.value = false
  isDeletingMember.value = false
}

function startEditing() {
  emit('error', '')
  resetArchiveState()
  resetDeleteState()
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  emit('error', '')
}

function finishMemberEdit(updatedMember: MemberRosterListItem) {
  isEditing.value = false
  emit('error', '')
  emit('saved', updatedMember)
}

function openArchiveConfirmation() {
  if (
    isArchivingMember.value ||
    isDeletingMember.value ||
    archiveModalVisible.value ||
    deleteModalVisible.value
  ) {
    return
  }

  emit('error', '')
  resetDeleteState()
  archiveModalVisible.value = true
}

function closeArchiveModal() {
  resetArchiveState()
}

function openDeleteConfirmation() {
  if (
    isDeletingMember.value ||
    isArchivingMember.value ||
    archiveModalVisible.value ||
    deleteModalVisible.value
  ) {
    return
  }

  emit('error', '')
  resetArchiveState()
  deleteModalVisible.value = true
}

function closeDeleteModal() {
  resetDeleteState()
}

function finishArchiveMember(memberId: string) {
  resetArchiveState()
  emit('archived', memberId)
}

function finishDeleteMember(memberId: string) {
  resetDeleteState()
  emit('deleted', memberId)
}
</script>

<template>
  <MemberDetailsBaseDrawer :is-open="isOpen" :member="member">
    <template #actions>
      <!-- What: inline member actions now reuse the shared AppButton primitive. Why: edit flows should inherit the same tap targets and state styling as the rest of this mobile-first PWA instead of shipping view-specific button markup. -->
      <AppButton
        v-if="!isEditing"
        variant="secondary"
        type="button"
        :disabled="memberActionDisabled"
        @click="startEditing"
      >
        {{ t('actions.openEdit') }}
      </AppButton>
      <ArchiveIconButton
        v-if="!isEditing"
        data-testid="member-archive-open"
        :disabled="
          isArchivingMember ||
          isDeletingMember ||
          archiveModalVisible ||
          deleteModalVisible
        "
        :aria-label="
          t('actions.archiveMemberAria', {
            name: memberDisplayName
          })
        "
        :title="
          t('actions.archiveMemberAria', {
            name: memberDisplayName
          })
        "
        @click="openArchiveConfirmation"
      />
      <DeleteIconButton
        v-if="!isEditing"
        data-testid="member-delete-open"
        :aria-label="
          t('actions.deleteMemberAria', {
            name: memberDisplayName
          })
        "
        :title="
          t('actions.deleteMemberAria', {
            name: memberDisplayName
          })
        "
        :disabled="
          isDeletingMember ||
          isArchivingMember ||
          archiveModalVisible ||
          deleteModalVisible
        "
        @click="openDeleteConfirmation"
      />
    </template>
    <MemberEditDrawer
      :is-open="isEditing"
      :member="member"
      @cancel="cancelEditing"
      @error="emit('error', $event)"
      @saved="finishMemberEdit"
    />
    <MemberDeleteConfirmationModal
      :member="member"
      :visible="deleteModalVisible"
      @close="closeDeleteModal"
      @deleted="finishDeleteMember"
      @error="emit('error', $event)"
      @pending-change="isDeletingMember = $event"
    />
    <MemberArchiveConfirmationModal
      :member="member"
      :visible="archiveModalVisible"
      @archived="finishArchiveMember"
      @close="closeArchiveModal"
      @error="emit('error', $event)"
      @pending-change="isArchivingMember = $event"
    />
  </MemberDetailsBaseDrawer>
</template>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "archiveMemberAria": "Zarchiwizuj członka {name}",
      "deleteMemberAria": "Usuń członka {name}",
      "openEdit": "Edytuj"
    }
  },
  "en": {
    "actions": {
      "archiveMemberAria": "Archive member {name}",
      "deleteMemberAria": "Delete member {name}",
      "openEdit": "Edit"
    }
  }
}
</i18n>

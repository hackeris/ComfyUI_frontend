<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import Button from '@/components/ui/button/Button.vue'
import Dialog from '@/components/ui/dialog/Dialog.vue'
import DialogClose from '@/components/ui/dialog/DialogClose.vue'
import DialogContent from '@/components/ui/dialog/DialogContent.vue'
import DialogHeader from '@/components/ui/dialog/DialogHeader.vue'
import DialogOverlay from '@/components/ui/dialog/DialogOverlay.vue'
import DialogPortal from '@/components/ui/dialog/DialogPortal.vue'
import DialogTitle from '@/components/ui/dialog/DialogTitle.vue'
import { useToastStore } from '@/platform/updates/common/toastStore'
import {
  ModelDownloadUnsupportedError,
  fetchModelDownloadCatalog,
  type CatalogEntry
} from '@/services/modelDownloadService'
import { useElectronDownloadStore } from '@/stores/electronDownloadStore'
import { useModelStore } from '@/stores/modelStore'

const modelValue = defineModel<boolean>({ default: false })

const { t } = useI18n()
const toastStore = useToastStore()
const electronDownloadStore = useElectronDownloadStore()
const modelStore = useModelStore()

const entries = ref<CatalogEntry[]>([])
const loading = ref(false)
const loadError = ref(false)

const visible = computed({
  get: () => modelValue.value,
  set: (v: boolean) => (modelValue.value = v)
})

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let u = 0
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u++
  }
  return `${v.toFixed(v >= 100 || u === 0 ? 0 : 1)} ${units[u]}`
}

const activeDownload = (url: string) =>
  electronDownloadStore.downloads.find(
    (d) => d.url === url && d.status !== 'completed'
  )

async function loadCatalog(): Promise<void> {
  loading.value = true
  loadError.value = false
  try {
    entries.value = await fetchModelDownloadCatalog()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

watch(
  modelValue,
  (open) => {
    if (open && entries.value.length === 0) void loadCatalog()
    if (!open) {
      // 关闭时刷新模型树(下载可能已完成, 选择器缓存需失效重载)
      void modelStore.refresh()
    }
  },
  { immediate: true }
)

async function download(e: CatalogEntry): Promise<void> {
  try {
    await electronDownloadStore.start({
      url: e.url,
      savePath: e.directory,
      filename: e.name
    })
  } catch (err: unknown) {
    if (err instanceof ModelDownloadUnsupportedError) {
      toastStore.add({
        severity: 'warn',
        summary: t('modelDownloads.backendUnavailable'),
        life: 5000
      })
      return
    }
    toastStore.add({
      severity: 'error',
      summary: t('modelDownloads.downloadFailed'),
      detail: err instanceof Error ? err.message : undefined,
      life: 5000
    })
  }
}
</script>

<template>
  <Dialog v-model:open="visible">
    <DialogPortal>
      <DialogOverlay />
      <DialogContent size="md" aria-describedby="model-download-dialog-body">
        <DialogHeader>
          <DialogTitle>{{ t('modelDownloads.title') }}</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <div
          id="model-download-dialog-body"
          class="flex flex-col gap-4 px-4 py-2 text-sm"
        >
          <div v-if="loadError" class="text-danger text-sm">
            {{ t('modelDownloads.backendUnavailable') }}
          </div>
          <div
            v-else-if="loading"
            class="py-4 text-center text-sm text-muted-foreground"
          >
            {{ t('modelDownloads.loading') }}
          </div>
          <div
            v-else-if="entries.length === 0"
            class="py-4 text-center text-sm text-muted-foreground"
          >
            {{ t('modelDownloads.empty') }}
          </div>
          <div v-else class="flex flex-col gap-2">
            <div
              v-for="e in entries"
              :key="e.id"
              class="border-border flex items-center justify-between rounded-sm border p-2"
            >
              <div class="flex min-w-0 flex-col">
                <span class="truncate text-sm font-medium">{{ e.name }}</span>
                <span class="truncate text-xs text-muted-foreground">
                  {{ e.directory }} · {{ formatBytes(e.size_bytes) }} ·
                  {{ e.description }}
                </span>
                <span v-if="e.tier === 'required'" class="text-warning text-xs">
                  {{ t('modelDownloads.required') }}
                </span>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <template v-if="activeDownload(e.url)">
                  <span class="text-xs text-muted-foreground">
                    {{ t('modelDownloads.downloading') }}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="electronDownloadStore.cancel(e.url)"
                  >
                    {{ t('modelDownloads.cancel') }}
                  </Button>
                </template>
                <Button v-else size="sm" @click="download(e)">
                  {{ t('modelDownloads.download') }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </Dialog>
</template>

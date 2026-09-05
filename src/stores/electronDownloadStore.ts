import { DownloadStatus } from '@comfyorg/comfyui-electron-types'
import type { DownloadState } from '@comfyorg/comfyui-electron-types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { isDesktop } from '@/platform/distribution/types'
import { reportError } from '@/platform/telemetry/reportError'
import {
  cancelBackendModelDownload,
  listBackendModelDownloads,
  pauseBackendModelDownload,
  resumeBackendModelDownload,
  startBackendModelDownload,
  type BackendModelDownloadTask
} from '@/services/modelDownloadService'
import { electronAPI } from '@/utils/envUtil'

export interface ElectronDownload extends Pick<
  DownloadState,
  'url' | 'filename'
> {
  progress?: number
  savePath?: string
  status?: DownloadStatus
  /** web 分支: 后端任务 id(pause/resume/cancel 用) */
  task_id?: string
}

/** Electron downloads store handler */
export const useElectronDownloadStore = defineStore('downloads', () => {
  const downloads = ref<ElectronDownload[]>([])
  const DownloadManager = isDesktop ? electronAPI().DownloadManager : undefined

  /** web 分支: 后端 /api/models/download 探测成功(UI 门控/桥接启用) */
  const backendSupported = ref(false)

  const findByUrl = (url: string) =>
    downloads.value.find((download) => url === download.url)

  const toElectronDownload = (t: BackendModelDownloadTask): ElectronDownload => ({
    url: t.url,
    filename: t.filename,
    savePath: t.dest_dir ?? t.directory,
    status: t.status as DownloadStatus,
    progress: t.bytes_total > 0 ? t.bytes_received / t.bytes_total : undefined,
    task_id: t.task_id
  })

  const upsert = (row: ElectronDownload) => {
    const existing = findByUrl(row.url)
    if (existing) {
      existing.progress = row.progress
      existing.status = row.status
      existing.filename = row.filename
      existing.savePath = row.savePath
      existing.task_id = row.task_id
    } else {
      downloads.value.push(row)
    }
  }

  const POLL_MS = 1000
  const poll = async (): Promise<void> => {
    if (document.visibilityState !== 'visible') return
    try {
      const tasks = await listBackendModelDownloads()
      for (const t of tasks) upsert(toElectronDownload(t))
    } catch {
      // 后端不可达(未起/降级): 保留既有行, 下轮再试
    }
  }

  const initialize = async () => {
    if (isDesktop && DownloadManager) {
      const allDownloads = await DownloadManager.getAllDownloads()

      for (const download of allDownloads) {
        downloads.value.push(download)
      }

      DownloadManager.onDownloadProgress((data) => {
        upsert(data)
      })
      return
    }
    // web 分支(W3): 探测后端下载端点; 404 → 保持官方降级(不建轮询)
    try {
      const tasks = await listBackendModelDownloads()
      backendSupported.value = true
      for (const t of tasks) upsert(toElectronDownload(t))
      setInterval(poll, POLL_MS)
    } catch (e) {
      if (e instanceof Error && e.name === 'ModelDownloadUnsupportedError') return
      reportError(e, { errorType: 'model_download_backend_probe_failed' })
    }
  }

  void initialize()

  const start = ({
    url,
    savePath,
    filename
  }: {
    url: string
    savePath: string
    filename: string
  }) => {
    if (isDesktop && DownloadManager) {
      return DownloadManager.startDownload(url, savePath, filename)
    }
    return startBackendModelDownload(url, savePath, filename).then((t) => {
      upsert(toElectronDownload(t))
    })
  }

  const pause = (url: string) => {
    if (isDesktop && DownloadManager) return DownloadManager.pauseDownload(url)
    const row = findByUrl(url)
    return row?.task_id ? pauseBackendModelDownload(row.task_id) : Promise.resolve()
  }
  const resume = (url: string) => {
    if (isDesktop && DownloadManager) return DownloadManager.resumeDownload(url)
    const row = findByUrl(url)
    return row?.task_id ? resumeBackendModelDownload(row.task_id) : Promise.resolve()
  }
  const cancel = (url: string) => {
    if (isDesktop && DownloadManager) return DownloadManager.cancelDownload(url)
    const row = findByUrl(url)
    return row?.task_id ? cancelBackendModelDownload(row.task_id) : Promise.resolve()
  }

  return {
    downloads,
    start,
    pause,
    resume,
    cancel,
    findByUrl,
    initialize,
    backendSupported,
    inProgressDownloads: computed(() =>
      downloads.value.filter(
        ({ status }) => status !== DownloadStatus.COMPLETED
      )
    )
  }
})

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BackendModelDownloadTask } from '@/services/modelDownloadService'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn()
}))

vi.mock('@/services/modelDownloadService', () => ({
  listBackendModelDownloads: mocks.list,
  startBackendModelDownload: mocks.start,
  pauseBackendModelDownload: mocks.pause,
  resumeBackendModelDownload: mocks.resume,
  cancelBackendModelDownload: mocks.cancel,
  ModelDownloadUnsupportedError: class extends Error {
    override name = 'ModelDownloadUnsupportedError'
  }
}))

vi.mock('@/platform/telemetry/reportError', () => ({
  reportError: vi.fn()
}))

const task = (over: Partial<BackendModelDownloadTask> = {}): BackendModelDownloadTask => ({
  task_id: 'a1b2c3d4e5f60718',
  url: 'https://huggingface.co/x/a.safetensors',
  directory: 'checkpoints',
  dest_dir: '/models/checkpoints',
  filename: 'a.safetensors',
  status: 'in_progress',
  bytes_received: 100,
  bytes_total: 1000,
  speed_bps: 0,
  created_at: 0,
  updated_at: 0,
  ...over
})

describe('useElectronDownloadStore (web 分支)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.list.mockReset()
    mocks.start.mockReset()
    mocks.pause.mockReset()
    mocks.resume.mockReset()
    mocks.cancel.mockReset()
  })

  it('探测成功 → backendSupported=true, 初始行进入', async () => {
    mocks.list.mockResolvedValue([task()])
    const { useElectronDownloadStore } = await import('./electronDownloadStore')
    const store = useElectronDownloadStore()
    await new Promise((r) => setTimeout(r, 0))
    expect(store.backendSupported).toBe(true)
    expect(store.downloads.length).toBe(1)
    expect(store.downloads[0].filename).toBe('a.safetensors')
    expect(store.downloads[0].savePath).toBe('/models/checkpoints')
    expect(store.downloads[0].task_id).toBe('a1b2c3d4e5f60718')
  })

  it('探测 404(不可用)→ backendSupported=false, 不建轮询', async () => {
    const e = new Error('no backend')
    e.name = 'ModelDownloadUnsupportedError'
    mocks.list.mockRejectedValue(e)
    const { useElectronDownloadStore } = await import('./electronDownloadStore')
    const store = useElectronDownloadStore()
    await new Promise((r) => setTimeout(r, 0))
    expect(store.backendSupported).toBe(false)
  })

  it('start 走后端并 push 行', async () => {
    mocks.list.mockResolvedValue([])
    mocks.start.mockResolvedValue(task({ status: 'pending' }))
    const { useElectronDownloadStore } = await import('./electronDownloadStore')
    const store = useElectronDownloadStore()
    await new Promise((r) => setTimeout(r, 0))
    await store.start({ url: task().url, savePath: 'checkpoints', filename: 'a.safetensors' })
    expect(mocks.start).toHaveBeenCalledWith(task().url, 'checkpoints', 'a.safetensors')
    expect(store.downloads.find((d) => d.url === task().url)?.status).toBe('pending')
  })

  it('pause/resume/cancel 以行内 task_id 调后端', async () => {
    mocks.list.mockResolvedValue([])
    mocks.start.mockResolvedValue(task({ status: 'pending' }))
    mocks.pause.mockResolvedValue(undefined)
    mocks.resume.mockResolvedValue(undefined)
    mocks.cancel.mockResolvedValue(undefined)
    const { useElectronDownloadStore } = await import('./electronDownloadStore')
    const store = useElectronDownloadStore()
    await store.start({ url: task().url, savePath: 'checkpoints', filename: 'a.safetensors' })
    store.pause(task().url)
    store.resume(task().url)
    store.cancel(task().url)
    expect(mocks.pause).toHaveBeenCalledWith('a1b2c3d4e5f60718')
    expect(mocks.resume).toHaveBeenCalledWith('a1b2c3d4e5f60718')
    expect(mocks.cancel).toHaveBeenCalledWith('a1b2c3d4e5f60718')
  })

  it('cancel 成功后本地行即时置 cancelled', async () => {
    mocks.list.mockResolvedValue([task()])
    mocks.cancel.mockResolvedValue(undefined)
    const { useElectronDownloadStore } = await import('./electronDownloadStore')
    const store = useElectronDownloadStore()
    await new Promise((r) => setTimeout(r, 0))
    await store.cancel(task().url)
    expect(store.downloads.find((d) => d.url === task().url)?.status).toBe(
      'cancelled'
    )
  })

  it('cancelled 任务不再随轮询/初始化进入列表(× 移除后不复现)', async () => {
    mocks.list.mockResolvedValue([task({ status: 'cancelled' })])
    const { useElectronDownloadStore } = await import('./electronDownloadStore')
    const store = useElectronDownloadStore()
    await new Promise((r) => setTimeout(r, 0))
    expect(store.downloads.length).toBe(0)
  })
})

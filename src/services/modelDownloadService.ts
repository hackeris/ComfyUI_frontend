import { api } from '@/scripts/api'

/**
 * OHOS 模型下载后端服务(fork 定制, W3, docs/model-download.md)。
 * 官方 web 构建下模型下载原走 electron bridge / 浏览器新标签;
 * 本服务把"下载执行器"嫁接到 core server 的 /api/models/download 端点。
 * 后端无此端点(官方原版 core)→ 404 → ModelDownloadUnsupportedError,
 * 调用方(missingModelDownload/electronDownloadStore)负责回落官方行为。
 */
export type ModelDownloadStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled'

export interface BackendModelDownloadTask {
  task_id: string
  url: string
  directory: string
  dest_dir?: string
  filename: string
  status: ModelDownloadStatus
  bytes_received: number
  bytes_total: number
  speed_bps: number
  error?: { code: string; message: string }
  created_at: number
  updated_at: number
}

export interface CatalogEntry {
  id: string
  name: string
  directory: string
  url: string
  size_bytes: number
  description: string
  tier: 'required' | 'optional'
}

export class ModelDownloadUnsupportedError extends Error {
  constructor() {
    super('Model download backend is not available (404)')
    this.name = 'ModelDownloadUnsupportedError'
  }
}

const isNotFound = (res: Response) => res.status === 404
const errBody = async (res: Response): Promise<Error> => {
  try {
    const j = await res.json()
    const code = j?.error?.code ?? `HTTP_${res.status}`
    const message = j?.error?.message ?? res.statusText
    return new Error(`${code}: ${message}`)
  } catch {
    return new Error(`HTTP_${res.status}: ${res.statusText}`)
  }
}

/** POST /models/download 只回 {task_id, status} —— 其余字段靠 list 轮询补齐 */
export type BackendModelDownloadStart = Pick<
  BackendModelDownloadTask,
  'task_id' | 'status'
>

export async function startBackendModelDownload(
  url: string,
  directory: string,
  filename: string
): Promise<BackendModelDownloadStart> {
  const res = await api.fetchApi('/models/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, directory, filename })
  })
  if (isNotFound(res)) throw new ModelDownloadUnsupportedError()
  if (!res.ok) throw await errBody(res)
  return await res.json()
}

export async function listBackendModelDownloads(): Promise<
  BackendModelDownloadTask[]
> {
  const res = await api.fetchApi('/models/download')
  if (isNotFound(res)) throw new ModelDownloadUnsupportedError()
  if (!res.ok) throw await errBody(res)
  const data = await res.json()
  return data.tasks ?? []
}

export async function pauseBackendModelDownload(taskId: string): Promise<void> {
  const res = await api.fetchApi(`/models/download/${taskId}/pause`, {
    method: 'POST'
  })
  if (!res.ok) throw await errBody(res)
}

export async function resumeBackendModelDownload(
  taskId: string
): Promise<void> {
  const res = await api.fetchApi(`/models/download/${taskId}/resume`, {
    method: 'POST'
  })
  if (!res.ok) throw await errBody(res)
}

export async function cancelBackendModelDownload(
  taskId: string
): Promise<void> {
  const res = await api.fetchApi(`/models/download/${taskId}/cancel`, {
    method: 'POST'
  })
  if (!res.ok) throw await errBody(res)
}

export async function fetchModelDownloadCatalog(): Promise<CatalogEntry[]> {
  const res = await api.fetchApi('/models/download/catalog')
  if (isNotFound(res)) return []
  if (!res.ok) throw await errBody(res)
  const data = await res.json()
  return data.catalog ?? []
}

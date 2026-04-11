import type {
  BuildSignalResult,
  ClientConfig,
  FormDataEntryInput,
  FormDataValue,
  QueryType,
  RequestConfig,
  UploadData,
  UploadFile,
} from './types.js'

export function buildUrl(baseUrl: string, url: string, query: QueryType) {
  const joinedUrl = joinUrl(baseUrl, url)
  const isAbsolute = /^https?:\/\//.test(joinedUrl)

  const urlObj = isAbsolute ? new URL(joinedUrl) : new URL(joinedUrl, 'http://okxie-link.local')

  Object.keys(query).forEach((key) => {
    const value = query[key]

    if (value === null || value === undefined) {
      return
    }

    urlObj.searchParams.set(key, String(value))
  })

  if (isAbsolute) {
    return urlObj.toString()
  }

  return `${urlObj.pathname}${urlObj.search}${urlObj.hash}`
}

export function joinUrl(baseUrl: string, url: string) {
  if (/^https?:\/\//.test(url)) {
    return url
  }
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, baseUrl.length - 1)
  }
  if (url.startsWith('/')) {
    url = url.slice(1, url.length)
  }
  return `${baseUrl}/${url}`
}

export function buildBody(
  body: unknown,
  headers: Headers,
): { body: BodyInit | null; headers: Headers } {
  headers = new Headers(headers)
  if (typeof body === 'string') {
    return {
      body,
      headers,
    }
  }

  if (body instanceof FormData) {
    return {
      body,
      headers,
    }
  }

  if (body === null || body === undefined) {
    return {
      body: null,
      headers,
    }
  }
  if (Array.isArray(body) || isPlainObject(body)) {
    headers.set('Content-Type', 'application/json')
    return {
      body: JSON.stringify(body),
      headers,
    }
  }
  return {
    body: body as BodyInit,
    headers,
  }
}

export function isPlainObject(obj: unknown) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

export function buildSignal(rcfg: RequestConfig, ccfg: ClientConfig): BuildSignalResult {
  if (rcfg.signal) {
    return {
      signal: rcfg.signal,
      source: 'user',
    }
  }

  if (rcfg.timeout != null) {
    return {
      signal: AbortSignal.timeout(rcfg.timeout),
      source: 'timeout',
    }
  }

  if (ccfg.timeout != null) {
    return {
      signal: AbortSignal.timeout(ccfg.timeout),
      source: 'timeout',
    }
  }

  return {
    signal: undefined,
    source: 'none',
  }
}

export function toFormData(data: UploadData, formData: FormData = new FormData()): FormData {
  for (const [key, value] of Object.entries(data)) {
    appendFormDataValue(formData, key, value)
  }

  return formData
}

export function appendFormDataValue(formData: FormData, key: string, value: FormDataValue): void {
  if (isFormDataArray(value)) {
    for (const item of value) {
      appendFormDataEntry(formData, key, item)
    }
    return
  }

  appendFormDataEntry(formData, key, value)
}

export function appendUploadFile(formData: FormData, key: string, file: UploadFile): void {
  if (isUploadFileDescriptor(file)) {
    if (file.filename) {
      formData.append(key, file.file, file.filename)
      return
    }

    formData.append(key, file.file)
    return
  }

  formData.append(key, file)
}

function appendFormDataEntry(formData: FormData, key: string, value: FormDataEntryInput): void {
  if (value == null) {
    return
  }

  if (value instanceof Blob) {
    formData.append(key, value)
    return
  }

  if (value instanceof Date) {
    formData.append(key, value.toISOString())
    return
  }

  formData.append(key, String(value))
}

function isUploadFileDescriptor(value: UploadFile): value is Exclude<UploadFile, Blob> {
  return typeof value === 'object' && value !== null && 'file' in value
}

function isFormDataArray(value: FormDataValue): value is readonly FormDataEntryInput[] {
  return Array.isArray(value)
}

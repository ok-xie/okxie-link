import { AbortError, HttpError, NetworkError, TimeoutError } from './errors.js'
import {
  HTTP_METHOD,
  type ClientConfig,
  type DeleteRequestConfig,
  type GetRequestConfig,
  type HeadRequestConfig,
  type OptionsRequestConfig,
  type PatchRequestConfig,
  type PostRequestConfig,
  type PutRequestConfig,
  type RequestConfig,
  type UploadRequestConfig,
} from './types.js'
import { appendUploadFile, buildBody, buildSignal, buildUrl, toFormData } from './utils.js'

export class HttpClient {
  config: ClientConfig
  constructor(config: ClientConfig) {
    this.config = config
  }
  async request(config: RequestConfig): Promise<Response> {
    const { query, url, body, headers, timeout: _, ...init } = config
    const realURL = buildUrl(this.config.baseUrl, url, query || {})
    const buildBodyResult = buildBody(body, new Headers(headers))
    const { signal, source } = buildSignal(config, this.config)
    const requestOptions: RequestInit = { ...init, ...buildBodyResult, signal }
    try {
      const response = await fetch(realURL, requestOptions)
      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status} ${response.statusText} - ${realURL}`,
          response.status,
          realURL,
        )
      }
      return response
    } catch (error) {
      if (error instanceof HttpError) {
        throw error
      }
      const isAbortError = error instanceof Error && error.name === 'AbortError'

      if (isAbortError && source === 'timeout') {
        throw new TimeoutError(`Request timed out - ${realURL}`, realURL, error)
      }

      if (isAbortError && source === 'user') {
        throw new AbortError(`Request was aborted - ${realURL}`, realURL, error)
      }

      throw new NetworkError(`Network request failed - ${realURL}`, realURL, error as Error)
    }
  }
  async requestJson<T>(config: RequestConfig): Promise<T | undefined> {
    const response = await this.request(config)
    if (response.status === 204) {
      return undefined
    }
    return await response.json()
  }

  async get(url: string, config?: GetRequestConfig): Promise<Response> {
    return this.request({
      ...config,
      url,
      method: HTTP_METHOD.GET,
    })
  }

  async delete(url: string, config?: DeleteRequestConfig): Promise<Response> {
    return this.request({
      ...config,
      url,
      method: HTTP_METHOD.DELETE,
    })
  }

  async post(url: string, config?: PostRequestConfig): Promise<Response> {
    return this.request({
      ...config,
      url,
      method: HTTP_METHOD.POST,
    })
  }

  async put(url: string, config?: PutRequestConfig): Promise<Response> {
    return this.request({
      ...config,
      url,
      method: HTTP_METHOD.PUT,
    })
  }

  async patch(url: string, config?: PatchRequestConfig): Promise<Response> {
    return this.request({
      ...config,
      url,
      method: HTTP_METHOD.PATCH,
    })
  }

  async head(url: string, config?: HeadRequestConfig): Promise<Response> {
    return this.request({
      ...config,
      url,
      method: HTTP_METHOD.HEAD,
    })
  }

  async options(url: string, config?: OptionsRequestConfig): Promise<Response> {
    return this.request({
      ...config,
      url,
      method: HTTP_METHOD.OPTIONS,
    })
  }
  async getJson<T>(url: string, config?: GetRequestConfig): Promise<T | undefined> {
    return this.requestJson<T>({
      ...config,
      url,
      method: HTTP_METHOD.GET,
    })
  }

  async postJson<T>(url: string, config?: PostRequestConfig): Promise<T | undefined> {
    return this.requestJson<T>({
      ...config,
      url,
      method: HTTP_METHOD.POST,
    })
  }

  async putJson<T>(url: string, config?: PutRequestConfig): Promise<T | undefined> {
    return this.requestJson<T>({
      ...config,
      url,
      method: HTTP_METHOD.PUT,
    })
  }

  async upload(url: string, config: UploadRequestConfig = {}): Promise<Response> {
    const { data, file, files, fileFieldName = files ? 'files' : 'file', formData, ...rest } = config
    const body = toFormData(data ?? {}, formData ?? new FormData())

    if (file) {
      appendUploadFile(body, fileFieldName, file)
    }

    if (files) {
      for (const currentFile of files) {
        appendUploadFile(body, fileFieldName, currentFile)
      }
    }

    return this.post(url, {
      ...rest,
      body,
    })
  }

  async uploadJson<T>(url: string, config: UploadRequestConfig = {}): Promise<T | undefined> {
    const { data, file, files, fileFieldName = files ? 'files' : 'file', formData, ...rest } = config
    const body = toFormData(data ?? {}, formData ?? new FormData())

    if (file) {
      appendUploadFile(body, fileFieldName, file)
    }

    if (files) {
      for (const currentFile of files) {
        appendUploadFile(body, fileFieldName, currentFile)
      }
    }

    return this.postJson<T>(url, {
      ...rest,
      body,
    })
  }
}

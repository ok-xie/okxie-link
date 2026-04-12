import { DefaultHttpContext } from '../context/http-context.js'
import { appendUploadFile, toFormData } from '../helpers/form-data.js'
import { resolveRequestConfig } from '../helpers/request-config.js'
import { compose } from '../pipeline/compose.js'
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
} from '../types/http.js'
import type { HttpMiddleware } from '../types/middleware.js'
import type { HttpTransport } from '../types/transport.js'
import type { UploadRequestConfig } from '../types/upload.js'
import { createFetchTransport } from '../transport/fetch-transport.js'

export class HttpClient {
  readonly config: Readonly<ClientConfig>
  readonly transport: HttpTransport
  private readonly middlewares: HttpMiddleware[] = []

  constructor(config: ClientConfig & { transport?: HttpTransport }) {
    const { transport, ...clientConfig } = config
    this.config = Object.freeze(clientConfig)
    this.transport = transport ?? createFetchTransport()
  }

  use(middleware: HttpMiddleware): () => void {
    this.middlewares.push(middleware)
    const index = this.middlewares.length - 1

    return () => {
      this.middlewares[index] = async (_ctx, next) => {
        await next()
      }
    }
  }

  async request(config: RequestConfig): Promise<Response> {
    const context = await this.execute(config)

    if (!context.response) {
      throw new Error('Request pipeline finished without producing a Response')
    }

    return context.response
  }

  async requestJson<T>(config: RequestConfig): Promise<T | undefined> {
    const context = await this.execute(config)

    if (!context.response || context.response.status === 204) {
      return undefined
    }

    return (await context.json()) as T
  }

  async requestData<T>(config: RequestConfig): Promise<T | undefined> {
    const context = await this.execute(config)
    return context.data as T | undefined
  }

  private async execute(config: RequestConfig): Promise<DefaultHttpContext> {
    const resolvedConfig = resolveRequestConfig(this.config, config)
    const context = new DefaultHttpContext(resolvedConfig)
    const pipeline = compose(this.middlewares)

    try {
      await pipeline(context, async () => {
        const response = await this.transport.request(context.request)
        context.setResponse(response)
      })
    } catch (error) {
      context.error = error
      throw error
    }

    return context
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

  async patchJson<T>(url: string, config?: PatchRequestConfig): Promise<T | undefined> {
    return this.requestJson<T>({
      ...config,
      url,
      method: HTTP_METHOD.PATCH,
    })
  }

  async deleteJson<T>(url: string, config?: DeleteRequestConfig): Promise<T | undefined> {
    return this.requestJson<T>({
      ...config,
      url,
      method: HTTP_METHOD.DELETE,
    })
  }

  async getData<T>(url: string, config?: GetRequestConfig): Promise<T | undefined> {
    return this.requestData<T>({
      ...config,
      url,
      method: HTTP_METHOD.GET,
    })
  }

  async postData<T>(url: string, config?: PostRequestConfig): Promise<T | undefined> {
    return this.requestData<T>({
      ...config,
      url,
      method: HTTP_METHOD.POST,
    })
  }

  async putData<T>(url: string, config?: PutRequestConfig): Promise<T | undefined> {
    return this.requestData<T>({
      ...config,
      url,
      method: HTTP_METHOD.PUT,
    })
  }

  async patchData<T>(url: string, config?: PatchRequestConfig): Promise<T | undefined> {
    return this.requestData<T>({
      ...config,
      url,
      method: HTTP_METHOD.PATCH,
    })
  }

  async deleteData<T>(url: string, config?: DeleteRequestConfig): Promise<T | undefined> {
    return this.requestData<T>({
      ...config,
      url,
      method: HTTP_METHOD.DELETE,
    })
  }

  async upload(url: string, config: UploadRequestConfig = {}): Promise<Response> {
    const body = createUploadBody(config)
    const { ...rest } = config

    return this.post(url, {
      ...rest,
      body,
    })
  }

  async uploadJson<T>(url: string, config: UploadRequestConfig = {}): Promise<T | undefined> {
    const body = createUploadBody(config)
    const { ...rest } = config

    return this.postJson<T>(url, {
      ...rest,
      body,
    })
  }

  async uploadData<T>(url: string, config: UploadRequestConfig = {}): Promise<T | undefined> {
    const body = createUploadBody(config)
    const { ...rest } = config

    return this.postData<T>(url, {
      ...rest,
      body,
    })
  }
}

function createUploadBody(config: UploadRequestConfig): FormData {
  const { data, file, files, fileFieldName = files ? 'files' : 'file', formData } = config
  const body = toFormData(data ?? {}, formData ?? new FormData())

  if (file) {
    appendUploadFile(body, fileFieldName, file)
  }

  if (files) {
    for (const currentFile of files) {
      appendUploadFile(body, fileFieldName, currentFile)
    }
  }

  return body
}

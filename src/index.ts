export { HttpClient } from './client/http-client.js'

export {
  HTTP_METHOD,
  type ClientConfig,
  type DeleteRequestConfig,
  type GetRequestConfig,
  type HeadRequestConfig,
  type HttpMethod,
  type OptionsRequestConfig,
  type PatchRequestConfig,
  type PostRequestConfig,
  type PutRequestConfig,
  type QueryRecord,
  type QueryValue,
  type RequestConfig,
  type ResolvedRequestConfig,
} from './types/http.js'

export {
  type HttpClientLike,
  type HttpContext,
  type HttpMiddleware,
  type Next,
} from './types/middleware.js'

export { type HttpTransport, type TransportCapabilities } from './types/transport.js'

export {
  type FormDataEntryInput,
  type FormDataPrimitive,
  type FormDataValue,
  type UploadData,
  type UploadFile,
  type UploadFileDescriptor,
  type UploadRequestConfig,
} from './types/upload.js'

export { AbortError, BizError, HttpError, NetworkError, TimeoutError } from './errors/index.js'

export {
  createBizMiddleware,
  type BizErrorHandler,
  type BizMiddlewareOptions,
  type BizThrowDecision,
} from './middlewares/biz.js'
export { createFetchTransport, FetchTransport } from './transport/fetch-transport.js'
export { createXhrTransport, XhrTransport } from './transport/xhr-transport.js'
export { appendUploadFile, toFormData } from './helpers/form-data.js'
export { resolveRequestConfig } from './helpers/request-config.js'

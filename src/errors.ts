export class HttpError extends Error {
  name: string
  status: number
  requestUrl: string
  constructor(message: string, status: number, requestUrl: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.requestUrl = requestUrl
  }
}

export class NetworkError extends Error {
  name: string
  requestUrl: string
  cause: Error
  constructor(message: string, requestUrl: string, cause: Error) {
    super(message)
    this.name = 'NetworkError'
    this.requestUrl = requestUrl
    this.cause = cause
  }
}

export class TimeoutError extends Error {
  name: string
  requestUrl: string
  cause: unknown
  constructor(message: string, requestUrl: string, cause: unknown) {
    super(message)
    this.name = 'TimeoutError'
    this.requestUrl = requestUrl
    this.cause = cause
  }
}

export class AbortError extends Error {
  name: string
  requestUrl: string
  cause: unknown
  constructor(message: string, requestUrl: string, cause: unknown) {
    super(message)
    this.name = 'AbortError'
    this.requestUrl = requestUrl
    this.cause = cause
  }
}

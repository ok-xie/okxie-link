import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AbortError,
  HttpClient,
  HttpError,
  HTTP_METHOD,
  NetworkError,
  TimeoutError,
} from '../src/index.js'

describe('HttpClient.request', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call fetch with built url', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    await client.request({
      url: '/users',
      method: HTTP_METHOD.GET,
      query: {
        page: 1,
      },
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [calledUrl] = fetchSpy.mock.calls[0]
    expect(calledUrl).toBe('https://api.example.com/users?page=1')
  })

  it('should send json body and json content-type for plain object body', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    await client.request({
      url: '/users',
      method: HTTP_METHOD.POST,
      body: {
        name: 'Tom',
      },
    })

    const [, init] = fetchSpy.mock.calls[0]
    const requestInit = init as RequestInit
    const headers = new Headers(requestInit.headers)

    expect(requestInit.body).toBe(JSON.stringify({ name: 'Tom' }))
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('should use request timeout before client timeout', async () => {
    const signal = new AbortController().signal
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal)
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
    })

    await client.request({
      url: '/users',
      method: HTTP_METHOD.GET,
      timeout: 1000,
    })

    expect(timeoutSpy).toHaveBeenCalledWith(1000)

    const [, init] = fetchSpy.mock.calls[0]
    const requestInit = init as RequestInit
    expect(requestInit.signal).toBe(signal)
  })

  it('should throw HttpError when response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not found', {
        status: 404,
        statusText: 'Not Found',
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    await expect(
      client.request({
        url: '/users/1',
        method: HTTP_METHOD.GET,
      }),
    ).rejects.toBeInstanceOf(HttpError)
  })

  it('should keep status and requestUrl in HttpError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('not found', {
        status: 404,
        statusText: 'Not Found',
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    try {
      await client.request({
        url: '/users/1',
        method: HTTP_METHOD.GET,
      })
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      const httpError = error as HttpError
      expect(httpError.status).toBe(404)
      expect(httpError.requestUrl).toBe('https://api.example.com/users/1')
    }
  })
})

describe('HttpClient.requestJson', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should parse successful response as json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Tom' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    const result = await client.requestJson<{ id: number; name: string }>({
      url: '/users/1',
      method: HTTP_METHOD.GET,
    })

    expect(result).toEqual({
      id: 1,
      name: 'Tom',
    })
  })

  it('should return undefined when requestJson receives 204 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 204,
        statusText: 'No Content',
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    const result = await client.requestJson<{ success: boolean }>({
      url: '/users/1',
      method: HTTP_METHOD.DELETE,
    })

    expect(result).toBeUndefined()
  })
})

describe('HttpClient json shortcut methods', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should get json with getJson', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Tom' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    const result = await client.getJson<{ id: number; name: string }>('/users/1')

    expect(result).toEqual({
      id: 1,
      name: 'Tom',
    })
  })

  it('should post json with postJson', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Tom' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    const result = await client.postJson<{ id: number; name: string }>('/users', {
      body: {
        name: 'Tom',
      },
    })

    expect(result).toEqual({
      id: 1,
      name: 'Tom',
    })

    const [, init] = fetchSpy.mock.calls[0]
    const requestInit = init as RequestInit
    const headers = new Headers(requestInit.headers)

    expect(requestInit.method).toBe(HTTP_METHOD.POST)
    expect(requestInit.body).toBe(JSON.stringify({ name: 'Tom' }))
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('should put json with putJson', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Jerry' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    const result = await client.putJson<{ id: number; name: string }>('/users/1', {
      body: {
        name: 'Jerry',
      },
    })

    expect(result).toEqual({
      id: 1,
      name: 'Jerry',
    })

    const [, init] = fetchSpy.mock.calls[0]
    const requestInit = init as RequestInit
    const headers = new Headers(requestInit.headers)

    expect(requestInit.method).toBe(HTTP_METHOD.PUT)
    expect(requestInit.body).toBe(JSON.stringify({ name: 'Jerry' }))
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('should return undefined when getJson receives 204 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 204,
        statusText: 'No Content',
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    const result = await client.getJson<{ id: number; name: string }>('/users/1')

    expect(result).toBeUndefined()
  })
})

describe('HttpClient.request error classification', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should throw NetworkError when fetch rejects with normal error', async () => {
    const originalError = new Error('network failed')

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(originalError)

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    await expect(
      client.request({
        url: '/users',
        method: HTTP_METHOD.GET,
      }),
    ).rejects.toBeInstanceOf(NetworkError)
  })

  it('should throw AbortError when fetch rejects with AbortError and source is user', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)

    const controller = new AbortController()
    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    await expect(
      client.request({
        url: '/users',
        method: HTTP_METHOD.GET,
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(AbortError)
  })

  it('should throw TimeoutError when fetch rejects with AbortError and source is timeout', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortError)

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
      timeout: 1000,
    })

    await expect(
      client.request({
        url: '/users',
        method: HTTP_METHOD.GET,
      }),
    ).rejects.toBeInstanceOf(TimeoutError)
  })
})

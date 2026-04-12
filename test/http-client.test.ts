import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpClient } from '../src/client/http-client.js'
import { BizError } from '../src/errors/biz-error.js'
import { createBizMiddleware } from '../src/middlewares/biz.js'

type UserPayload = {
  code: number
  message: string
  data: { id: number; name: string }
}

type TokenExpiredPayload = {
  code: number
  message: string
  data: null
}

type UploadPayload = {
  code: number
  data: { url: string }
}

describe('HttpClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should request and return Response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', {
        status: 200,
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    const response = await client.get('/users')

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('ok')
  })

  it('should request json through requestJson', async () => {
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

  it('should return undefined for 204 json responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    const result = await client.requestJson<{ success: boolean }>({
      url: '/users/1',
      method: 'DELETE',
    })

    expect(result).toBeUndefined()
  })

  it('should let middleware write ctx.data for requestData', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: { id: 1, name: 'Tom' } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    client.use(async (ctx, next) => {
      await next()
      const payload = (await ctx.json()) as { code: number; data: { id: number; name: string } }
      ctx.data = payload.data
    })

    const result = await client.requestData<{ id: number; name: string }>({
      url: '/users/1',
      method: 'GET',
    })

    expect(result).toEqual({
      id: 1,
      name: 'Tom',
    })
  })

  it('should let biz middleware write ctx.data for requestData', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: { id: 1, name: 'Tom' } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    client.use(
      createBizMiddleware<UserPayload, number>({
        isSuccess: (payload) => payload.code === 0,
        getMessage: (payload) => payload.message,
        getCode: (payload) => payload.code,
        getData: (payload) => payload.data,
      }),
    )

    const result = await client.getData<{ id: number; name: string }>('/users/1')

    expect(result).toEqual({
      id: 1,
      name: 'Tom',
    })
  })

  it('should throw BizError when biz middleware validation fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 40101, message: 'token expired', data: null }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    client.use(
      createBizMiddleware<TokenExpiredPayload, number>({
        isSuccess: (payload) => payload.code === 0,
        getMessage: (payload) => payload.message,
        getCode: (payload) => payload.code,
      }),
    )

    await expect(client.getJson('/users/1')).rejects.toBeInstanceOf(BizError)
  })

  it('should handle BizError inside biz middleware and suppress throw when configured', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 40101, message: 'token expired', data: null }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const onError = vi.fn((error: BizError<TokenExpiredPayload, number>, ctx) => {
      ctx.state.redirectTo = '/login'
      ctx.data = {
        redirected: true,
        message: error.message,
      }
    })

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    client.use(
      createBizMiddleware<TokenExpiredPayload, number>({
        isSuccess: (payload) => payload.code === 0,
        getMessage: (payload) => payload.message,
        getCode: (payload) => payload.code,
        onError,
        throwOnError: false,
      }),
    )

    const result = await client.getData<{ redirected: boolean; message: string }>('/users/1')

    expect(onError).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      redirected: true,
      message: 'token expired',
    })
  })

  it('should allow custom throw decisions after unified biz error handling', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 40101, message: 'token expired', data: null }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const onError = vi.fn()
    const throwOnError = vi.fn(
      (error: BizError<TokenExpiredPayload, number>) => error.code !== 40101,
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    client.use(
      createBizMiddleware<TokenExpiredPayload, number>({
        isSuccess: (payload) => payload.code === 0,
        getMessage: (payload) => payload.message,
        getCode: (payload) => payload.code,
        onError,
        throwOnError,
      }),
    )

    const result = await client.getJson<{ code: number; message: string }>('/users/1')

    expect(onError).toHaveBeenCalledTimes(1)
    expect(throwOnError).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      code: 40101,
      message: 'token expired',
      data: null,
    })
  })

  it('should upload form data with file and fields', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('ok', {
        status: 200,
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    await client.upload('/upload', {
      data: {
        userId: 123,
        tags: ['avatar', 'profile'],
      },
      file,
    })

    const [calledUrl, init] = fetchSpy.mock.calls[0]
    const requestInit = init as RequestInit
    const body = requestInit.body as FormData
    const headers = new Headers(requestInit.headers)

    expect(calledUrl).toBe('https://api.example.com/upload')
    expect(requestInit.method).toBe('POST')
    expect(body.get('userId')).toBe('123')
    expect(body.getAll('tags')).toEqual(['avatar', 'profile'])
    expect(body.get('file')).toBe(file)
    expect(headers.get('Content-Type')).toBeNull()
  })

  it('should upload data through uploadData when middleware sets ctx.data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: { url: '/assets/avatar.png' } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const client = new HttpClient({
      baseUrl: 'https://api.example.com',
    })

    client.use(
      createBizMiddleware<UploadPayload, number>({
        isSuccess: (payload) => payload.code === 0,
        getData: (payload) => payload.data,
      }),
    )

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    const result = await client.uploadData<{ url: string }>('/upload', {
      file,
      data: {
        userId: 'u-1',
      },
    })

    expect(result).toEqual({
      url: '/assets/avatar.png',
    })
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildBody, buildSignal, buildUrl } from '../src/utils.js'
describe('buildUrl', () => {
  it('should append query params', () => {
    const result = buildUrl('https://api.example.com', '/users', {
      page: 1,
      keyword: 'tom',
    })

    expect(result).toBe('https://api.example.com/users?page=1&keyword=tom')
  })

  it('should ignore null and undefined query values', () => {
    const result = buildUrl('https://api.example.com', '/users', {
      page: 1,
      keyword: undefined,
      deleted: null,
    })

    expect(result).toBe('https://api.example.com/users?page=1')
  })

  it('should handle trailing slash in baseUrl', () => {
    const result = buildUrl('https://api.example.com/', '/users', {})

    expect(result).toBe('https://api.example.com/users')
  })

  it('should keep absolute url unchanged except query append', () => {
    const result = buildUrl('https://api.example.com', 'https://other.com/users', {
      page: 1,
    })

    expect(result).toBe('https://other.com/users?page=1')
  })
})

describe('buildBody', () => {
  it('should stringify plain object body and set json content-type', () => {
    const result = buildBody({ name: 'Tom', age: 18 }, new Headers())

    expect(result.body).toBe(JSON.stringify({ name: 'Tom', age: 18 }))
    expect(result.headers.get('Content-Type')).toBe('application/json')
  })

  it('should stringify array body and set json content-type', () => {
    const result = buildBody([{ id: 1 }, { id: 2 }], new Headers())

    expect(result.body).toBe(JSON.stringify([{ id: 1 }, { id: 2 }]))
    expect(result.headers.get('Content-Type')).toBe('application/json')
  })

  it('should keep string body as is', () => {
    const result = buildBody('hello', new Headers())

    expect(result.body).toBe('hello')
    expect(result.headers.get('Content-Type')).toBeNull()
  })

  it('should keep FormData body as is', () => {
    const formData = new FormData()
    formData.append('name', 'Tom')

    const result = buildBody(formData, new Headers())

    expect(result.body).toBe(formData)
  })

  it('should return null when body is undefined', () => {
    const result = buildBody(undefined, new Headers())

    expect(result.body).toBeNull()
  })
})

describe('buildSignal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return request signal first when provided', () => {
    const controller = new AbortController()

    const result = buildSignal(
      {
        url: '/users',
        signal: controller.signal,
      },
      {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      },
    )

    expect(result.signal).toBe(controller.signal)
    expect(result.source).toBe('user')
  })

  it('should use request timeout before client timeout', () => {
    const signal = new AbortController().signal
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal)

    const result = buildSignal(
      {
        url: '/users',
        timeout: 1000,
      },
      {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      },
    )

    expect(timeoutSpy).toHaveBeenCalledWith(1000)
    expect(result.signal).toBe(signal)
    expect(result.source).toBe('timeout')
  })

  it('should use client timeout when request timeout is missing', () => {
    const signal = new AbortController().signal
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal)

    const result = buildSignal(
      {
        url: '/users',
      },
      {
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      },
    )

    expect(timeoutSpy).toHaveBeenCalledWith(5000)
    expect(result.signal).toBe(signal)
    expect(result.source).toBe('timeout')
  })

  it('should return none when no signal and no timeout', () => {
    const result = buildSignal(
      {
        url: '/users',
      },
      {
        baseUrl: 'https://api.example.com',
      },
    )

    expect(result.signal).toBeUndefined()
    expect(result.source).toBe('none')
  })
})

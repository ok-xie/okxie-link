import { describe, expect, it } from 'vitest'
import { DefaultHttpContext } from '../src/context/http-context.js'
import { resolveRequestConfig } from '../src/helpers/request-config.js'

describe('DefaultHttpContext', () => {
  it('should cache json reads', async () => {
    const context = new DefaultHttpContext<{ id: number }>(
      resolveRequestConfig(
        {
          baseUrl: 'https://api.example.com',
        },
        {
          url: '/users/1',
        },
      ),
    )

    context.setResponse(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    )

    const first = await context.json()
    const second = await context.json()

    expect(first).toEqual({ id: 1 })
    expect(second).toEqual({ id: 1 })
  })

  it('should set json response and cache both json and text', async () => {
    const context = new DefaultHttpContext<{ ok: boolean }>(
      resolveRequestConfig(
        {
          baseUrl: 'https://api.example.com',
        },
        {
          url: '/ping',
        },
      ),
    )

    context.setJson({ ok: true }, { status: 201 })

    expect(context.response?.status).toBe(201)
    await expect(context.json()).resolves.toEqual({ ok: true })
    await expect(context.text()).resolves.toBe(JSON.stringify({ ok: true }))
  })
})

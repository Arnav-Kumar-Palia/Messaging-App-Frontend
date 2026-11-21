import type { ProblemDetail } from './types'

/** Base URL of the backend; empty means same origin (the dev proxy). */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const BASE_URL = API_BASE_URL

const UNREACHABLE = 'Cannot reach the server. Check your connection and try again.'
/** Statuses a proxy or gateway returns when the API itself is down. */
const GATEWAY_ERRORS = new Set([502, 503, 504])

/** An error response from the API, carrying the server's readable `detail`. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong. Please try again.'
}

let authToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

/** Called when a request made with the current token comes back 401. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Send the Authorization header. Defaults to true. */
  auth?: boolean
}

export async function request<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const tokenUsed = auth ? authToken : null
  if (tokenUsed) headers.Authorization = `Bearer ${tokenUsed}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, UNREACHABLE)
  }

  if (!response.ok) {
    const message =
      (await readProblem(response)) ??
      (GATEWAY_ERRORS.has(response.status) ? UNREACHABLE : `Request failed (${response.status}).`)
    // Only a rejected token ends the session. A 401 from login means a wrong
    // email or password, and a 401 for a token that was already replaced is stale.
    if (response.status === 401 && tokenUsed && tokenUsed === authToken) {
      unauthorizedHandler?.()
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** The server's readable error text, or null if the body isn't a problem document. */
async function readProblem(response: Response): Promise<string | null> {
  try {
    const problem = (await response.json()) as ProblemDetail
    if (problem.detail) return problem.detail
    if (problem.title) return problem.title
  } catch {
    // Body was empty or not JSON.
  }
  return null
}

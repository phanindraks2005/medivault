import { DEMO_EMAIL, DEMO_USER_ID, cascadeDelete, demoFiles, demoTables, saveDemo } from '@/lib/demo/db'

// A stand-in for the network, given to the demo's Supabase client. It answers
// the small part of PostgREST, Auth and Storage the app uses, from the
// in-memory sample family. Nothing it receives ever leaves the browser.

type Row = Record<string, unknown>

export const demoUser = {
  id: DEMO_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: DEMO_EMAIL,
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2025-01-01T00:00:00.000Z',
}

// No body at all for "nothing to return": a 204 with even an empty string throws.
const json = (body: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// PostgREST filter values: eq.x, neq.x, in.(a,b), is.null, gt/gte/lt/lte.x
function matches(row: Row, column: string, filter: string) {
  const dot = filter.indexOf('.')
  const op = filter.slice(0, dot)
  const raw = filter.slice(dot + 1)
  const value = row[column]
  const text = value === null || value === undefined ? null : String(value)
  switch (op) {
    case 'eq':
      return text === raw
    case 'neq':
      return text !== raw
    case 'is':
      return raw === 'null' ? text === null : String(value) === raw
    case 'in':
      return raw.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, '')).includes(text ?? '')
    case 'gt':
      return text !== null && text > raw
    case 'gte':
      return text !== null && text >= raw
    case 'lt':
      return text !== null && text < raw
    case 'lte':
      return text !== null && text <= raw
    default:
      return true
  }
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])

function filtered(rows: Row[], params: URLSearchParams) {
  let out = rows
  params.forEach((filter, column) => {
    if (!RESERVED.has(column)) out = out.filter((r) => matches(r, column, filter))
  })
  return out
}

// order=record_date.desc.nullslast,created_at.desc
function ordered(rows: Row[], order: string | null) {
  if (!order) return rows
  const keys = order.split(',').map((part) => {
    const [column, dir = 'asc', nulls] = part.split('.')
    return { column, desc: dir === 'desc', nullsFirst: nulls ? nulls === 'nullsfirst' : dir === 'desc' }
  })
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const x = a[k.column] as string | null | undefined
      const y = b[k.column] as string | null | undefined
      if (x == null && y == null) continue
      if (x == null) return k.nullsFirst ? -1 : 1
      if (y == null) return k.nullsFirst ? 1 : -1
      if (x === y) continue
      return (x < y ? -1 : 1) * (k.desc ? -1 : 1)
    }
    return 0
  })
}

async function bodyOf(init?: RequestInit) {
  if (!init?.body || typeof init.body !== 'string') return null
  try {
    return JSON.parse(init.body)
  } catch {
    return null
  }
}

async function rest(url: URL, init: RequestInit | undefined, headers: Headers) {
  const table = url.pathname.split('/rest/v1/')[1]
  const tables = demoTables()
  if (!tables[table]) return json({ message: 'Not in the demo' }, 404)
  const method = (init?.method || 'GET').toUpperCase()
  const single = (headers.get('Accept') || '').includes('vnd.pgrst.object')
  const wantsRows = (headers.get('Prefer') || '').includes('return=representation')
  const respond = (rows: Row[], status = 200) => {
    if (single) return rows.length === 1 ? json(rows[0], status) : json({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: '', hint: null }, 406)
    return json(rows, status)
  }

  if (method === 'GET' || method === 'HEAD') {
    let rows = ordered(filtered(tables[table], url.searchParams), url.searchParams.get('order'))
    const limit = Number(url.searchParams.get('limit'))
    if (limit) rows = rows.slice(0, limit)
    return respond(rows)
  }

  if (method === 'POST') {
    const body = await bodyOf(init)
    const items: Row[] = (Array.isArray(body) ? body : [body]).filter(Boolean)
    const created = items.map((item) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...item, user_id: DEMO_USER_ID }))
    tables[table].push(...created)
    saveDemo()
    return wantsRows ? respond(created, 201) : json(undefined, 201)
  }

  const targets = filtered(tables[table], url.searchParams)
  if (method === 'PATCH') {
    const body = (await bodyOf(init)) || {}
    targets.forEach((row) => Object.assign(row, body, { user_id: DEMO_USER_ID }))
    saveDemo()
    return wantsRows ? respond(targets) : json(undefined, 204)
  }
  if (method === 'DELETE') {
    tables[table] = tables[table].filter((r) => !targets.includes(r))
    cascadeDelete(table, targets)
    saveDemo()
    return wantsRows ? respond(targets) : json(undefined, 204)
  }
  return json({ message: 'Not in the demo' }, 405)
}

function storage(url: URL, init: RequestInit | undefined) {
  const path = url.pathname.split('/storage/v1/object/')[1] || ''
  const method = (init?.method || 'GET').toUpperCase()
  if (path.startsWith('sign/')) return json({ signedURL: `/object/${path}?token=demo` })
  if (method === 'POST' || method === 'PUT') {
    const key = decodeURIComponent(path.replace(/^medical-records\//, ''))
    const body = init?.body
    const file = body instanceof Blob ? body : body instanceof FormData ? [...body.values()].find((v) => v instanceof Blob) : null
    if (file) demoFiles.set(key, URL.createObjectURL(file as Blob))
    return json({ Key: path, Id: crypto.randomUUID() })
  }
  if (method === 'DELETE') return json([])
  return json({ message: 'Not in the demo' }, 404)
}

export async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const headers = new Headers(init?.headers)
  if (url.pathname.includes('/rest/v1/')) return rest(url, init, headers)
  if (url.pathname.includes('/storage/v1/')) return storage(url, init)
  if (url.pathname.endsWith('/auth/v1/user')) return json(demoUser)
  if (url.pathname.includes('/auth/v1/')) return json({})
  return json({ message: 'Not in the demo' }, 404)
}

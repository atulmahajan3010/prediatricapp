export function parsePagination(query, defaultLimit = null) {
  const hasPagination = query.limit !== undefined || query.offset !== undefined
  if (!hasPagination && defaultLimit === null) return null

  const requestedLimit = Number.parseInt(query.limit, 10)
  const requestedOffset = Number.parseInt(query.offset, 10)
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : defaultLimit || 50, 1), 100)
  const offset = Math.max(Number.isFinite(requestedOffset) ? requestedOffset : 0, 0)
  return { limit, offset }
}

export function setPaginationHeaders(response, total, pagination) {
  if (!pagination) return
  response.set('X-Total-Count', String(total))
  response.set('X-Page-Limit', String(pagination.limit))
  response.set('X-Page-Offset', String(pagination.offset))
}
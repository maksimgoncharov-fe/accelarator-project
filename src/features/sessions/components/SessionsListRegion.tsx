import type { SessionsPage } from '../../../api/index.ts'
import type { ResourceState } from '../hooks/useResource.ts'
import { formatNumber, formatSessionCount } from '../model/format.ts'
import { ErrorState } from './ErrorState.tsx'
import { SessionsMobileList } from './SessionsMobileList.tsx'
import { SessionsTable, type SessionsViewProps } from './SessionsTable.tsx'

interface Props extends Omit<SessionsViewProps, 'items'> {
  list: ResourceState<SessionsPage> & { retry: () => void }
  filtered: boolean
  tableLayout: boolean
  onClear: () => void
  onCreate: () => void
}

function Skeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="skeleton__row" />
      ))}
    </div>
  )
}

export function SessionsListRegion({
  list,
  filtered,
  tableLayout,
  onClear,
  onCreate,
  ...view
}: Props) {
  const page = list.data
  let summary = ''
  if (list.status === 'loading') summary = 'Loading sessions…'
  else if (list.refreshing) summary = 'Updating…'
  else if (page) summary = formatSessionCount(page.total)

  const truncated = page && page.total > page.items.length

  return (
    <div className="list-region" aria-busy={list.status === 'loading' || list.refreshing}>
      <p className="result-summary" role="status">
        {summary}
      </p>

      {list.status === 'loading' ? <Skeleton /> : null}

      {list.status === 'error' ? (
        <ErrorState
          title="Sessions can't be loaded right now."
          message={list.error?.message}
          onRetry={list.retry}
        />
      ) : null}

      {page && list.status !== 'loading' && page.items.length === 0 && list.status === 'success' ? (
        filtered ? (
          <div className="state">
            <p className="state__title">No sessions match your filters.</p>
            <p className="state__text">Try a different search or status.</p>
            <div className="state__actions">
              <button type="button" className="button" onClick={onClear}>
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="state">
            <p className="state__title">No sessions yet.</p>
            <p className="state__text">Create your first training session.</p>
            <div className="state__actions">
              <button type="button" className="button button--primary" onClick={onCreate}>
                Create Session
              </button>
            </div>
          </div>
        )
      ) : null}

      {page && page.items.length > 0 && list.status !== 'loading' ? (
        <>
          {tableLayout ? (
            <SessionsTable items={page.items} {...view} />
          ) : (
            <SessionsMobileList items={page.items} {...view} />
          )}
          {truncated ? (
            <p className="muted list-note">
              Showing {formatNumber(page.items.length)} of {formatNumber(page.total)} sessions.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

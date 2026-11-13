import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionDetailsView } from '../../../api/index.ts'
import { useMediaQuery } from '../../../app/useMediaQuery.ts'
import { useUrlState } from '../../../app/useUrlState.ts'
import { hrefFor } from '../../../app/url-state.ts'
import { useSessionsList } from '../hooks/useSessionsList.ts'
import { isFiltered } from '../model/filters.ts'
import { CreateSessionDialog } from './CreateSessionDialog.tsx'
import { ResultBanner } from './ResultBanner.tsx'
import { SessionDetailsContainer } from './SessionDetailsContainer.tsx'
import { SessionsFilters } from './SessionsFilters.tsx'
import { SessionsListRegion } from './SessionsListRegion.tsx'
import '../sessions.css'

const BASE_TITLE = 'Training sessions'

interface CreatedNotice {
  session: SessionDetailsView
  /** List version at creation time: only a later, fresher list can say whether it is visible. */
  listVersion: number
}

export function SessionsPage() {
  const [url, actions] = useUrlState()
  const list = useSessionsList(url.query, url.status)
  const docked = useMediaQuery('(min-width: 1024px)')
  const tableLayout = useMediaQuery('(min-width: 720px)')
  const [created, setCreated] = useState<CreatedNotice | null>(null)
  const bannerRef = useRef<HTMLDivElement>(null)

  const filtered = isFiltered({ query: url.query, status: url.status })

  useEffect(() => {
    if (url.create) document.title = `Create session · ${BASE_TITLE}`
    else if (url.session) document.title = `Session details · ${BASE_TITLE}`
    else document.title = BASE_TITLE
  }, [url.create, url.session])

  const { retry: reloadList, version: listVersion } = list
  const handleCreated = useCallback(
    (session: SessionDetailsView) => {
      setCreated({ session, listVersion })
      reloadList()
      actions.closeOverlay()
    },
    [actions, listVersion, reloadList],
  )

  // Move focus to the confirmation once the create dialog has closed.
  useEffect(() => {
    if (created && !url.create) bannerRef.current?.focus()
  }, [created, url.create])

  const freshList = created !== null && list.version > created.listVersion && !list.refreshing
  const hidden =
    freshList &&
    list.status === 'success' &&
    !list.data?.items.some((item) => item.id === created.session.id)

  const resetFilters = () => {
    actions.clearFilters()
  }

  const selectedHref = useCallback(
    (id: string) => hrefFor({ ...url, session: id, create: false }),
    [url],
  )

  return (
    <div className="workspace">
      <div className="page-head">
        <div>
          <h1 id="sessions-heading" tabIndex={-1}>
            Training sessions
          </h1>
          <p className="muted">Find scheduled work, review capacity, and make schedule changes.</p>
        </div>
        <button type="button" className="button button--primary" onClick={actions.openCreate}>
          Create Session
        </button>
      </div>

      <SessionsFilters
        query={url.query}
        status={url.status}
        active={filtered}
        onQueryChange={actions.setQuery}
        onStatusChange={actions.setStatus}
        onClear={resetFilters}
      />

      {created ? (
        <ResultBanner
          ref={bannerRef}
          actions={
            <>
              <a
                className="button button--secondary"
                href={hrefFor({ ...url, session: created.session.id, create: false })}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
                  event.preventDefault()
                  setCreated(null)
                  actions.openSession(created.session.id)
                }}
              >
                Open Session
              </a>
              {hidden && filtered ? (
                <button type="button" className="button button--secondary" onClick={resetFilters}>
                  Reset Filters
                </button>
              ) : null}
              <button type="button" className="button button--link" onClick={() => setCreated(null)}>
                Dismiss
              </button>
            </>
          }
        >
          Session “{created.session.title}” was created.
          {hidden && filtered ? ' It is hidden by your current filters.' : ''}
        </ResultBanner>
      ) : null}

      <div className={url.session && docked ? 'workspace__body workspace__body--split' : 'workspace__body'}>
        <section id="results" aria-labelledby="results-heading" tabIndex={-1}>
          <h2 id="results-heading" className="visually-hidden">
            Sessions
          </h2>
          <SessionsListRegion
            list={list}
            filtered={filtered}
            tableLayout={tableLayout}
            selectedId={url.session}
            hrefFor={selectedHref}
            onOpen={actions.openSession}
            onClear={resetFilters}
            onCreate={actions.openCreate}
          />
        </section>
        {url.session ? (
          <SessionDetailsContainer
            key={docked ? 'docked' : 'sheet'}
            id={url.session}
            docked={docked}
            onClose={actions.closeOverlay}
          />
        ) : null}
      </div>

      {url.create ? <CreateSessionDialog onCreated={handleCreated} onClose={actions.closeOverlay} /> : null}
    </div>
  )
}

import { cleanup, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { setLatencyOverride, setScenario } from '../../mocks/scenarios.ts'
import { renderApp } from '../../test/render.tsx'

describe('sessions workspace', () => {
  it('shows a loading state, then the populated list with status text', async () => {
    setLatencyOverride(50)
    renderApp()

    expect(screen.getByText('Loading sessions…')).toBeInTheDocument()

    const table = await screen.findByRole('table', { name: 'Training sessions' })
    expect(screen.getByText('5 sessions')).toBeInTheDocument()

    const row = within(table).getByRole('row', { name: /U14 Shooting Lab/ })
    expect(within(row).getByText('Scheduled')).toBeInTheDocument()
    expect(within(row).getByText('Maya Brooks')).toBeInTheDocument()
    expect(within(row).getByText('14 / 18')).toBeInTheDocument()

    // Every status is distinguishable by text, not color alone.
    for (const label of ['Scheduled', 'Full', 'Cancelled', 'Completed']) {
      expect(within(table).getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('filters by search and status on the server and clears the filters', async () => {
    const { user } = renderApp()
    await screen.findByRole('table')

    await user.type(screen.getByRole('searchbox', { name: 'Search sessions' }), 'ortiz')
    expect(await screen.findByText('1 session')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Weekend Ball Handling' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'U14 Shooting Lab' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))
    expect(await screen.findByText('5 sessions')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search sessions' })).toHaveValue('')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'full')
    expect(await screen.findByText('1 session')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Varsity Defense Intensive' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Weekend Ball Handling' })).not.toBeInTheDocument()
  })

  it('distinguishes "no sessions exist" from "filters match nothing"', async () => {
    const { user } = renderApp({ scenario: 'empty' })
    expect(await screen.findByText('No sessions yet.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Create Session' }).length).toBeGreaterThan(0)
    expect(screen.queryByText('No sessions match your filters.')).not.toBeInTheDocument()
    cleanup()

    renderApp({ path: '/?q=zzzz-no-match' })
    expect(await screen.findByText('No sessions match your filters.')).toBeInTheDocument()
    expect(screen.queryByText('No sessions yet.')).not.toBeInTheDocument()

    const clearButtons = screen.getAllByRole('button', { name: 'Clear Filters' })
    await user.click(clearButtons[clearButtons.length - 1])
    expect(await screen.findByText('5 sessions')).toBeInTheDocument()
  })

  it('shows a recoverable error when the list request fails', async () => {
    const { user } = renderApp({ scenario: 'list-error' })

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText("Sessions can't be loaded right now.")).toBeInTheDocument()
    expect(within(alert).getByText('Sessions cannot be loaded right now.')).toBeInTheDocument()
    // The shell stays usable while the list is unavailable.
    expect(screen.getByRole('button', { name: 'Create Session' })).toBeEnabled()

    setScenario('normal')
    await user.click(within(alert).getByRole('button', { name: 'Try Again' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { setLatencyOverride } from '../../mocks/scenarios.ts'
import { renderApp } from '../../test/render.tsx'

async function openCreateDialog(user: UserEvent) {
  await screen.findByRole('table')
  await user.click(screen.getByRole('button', { name: 'Create Session' }))
  const dialog = await screen.findByRole('dialog', { name: 'Create session' })
  await within(dialog).findByRole('option', { name: 'Maya Brooks' })
  return dialog
}

async function fillValidForm(user: UserEvent, dialog: HTMLElement) {
  await user.type(within(dialog).getByRole('textbox', { name: 'Title' }), 'Sunday Shooting Clinic')
  await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Coach' }), 'Maya Brooks')
  fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-08-20' } })
  fireEvent.change(within(dialog).getByLabelText('Start time'), { target: { value: '18:30' } })
  await user.type(within(dialog).getByRole('spinbutton', { name: 'Capacity' }), '12')
  await user.type(within(dialog).getByRole('textbox', { name: 'Location name' }), 'Riverside Gym')
  await user.type(within(dialog).getByRole('textbox', { name: 'Location address' }), '4 Mill Lane')
}

describe('create session', () => {
  it('validates input, blocks duplicate submits, and makes the new session discoverable', async () => {
    setLatencyOverride(250)
    const { user } = renderApp()
    const dialog = await openCreateDialog(user)
    const submit = within(dialog).getByRole('button', { name: 'Create Session' })

    // Invalid submit: errors are associated with their controls and nothing is sent.
    await user.click(submit)
    const title = within(dialog).getByRole('textbox', { name: 'Title' })
    expect(title).toBeInvalid()
    expect(title).toHaveAccessibleDescription(/Enter a title of 3–80 characters\./)
    expect(within(dialog).getByRole('spinbutton', { name: 'Capacity' })).toBeInvalid()
    expect(title).toHaveFocus()

    // A start time in the past is rejected relative to the (frozen) clock.
    await fillValidForm(user, dialog)
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-07-01' } })
    await user.click(submit)
    expect(within(dialog).getByLabelText('Date')).toHaveAccessibleDescription(
      'Choose a start time in the future.',
    )

    // Valid submit; a second click while pending must not create a second session.
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2026-08-20' } })
    await user.dblClick(submit)
    expect(submit).toHaveAttribute('aria-disabled', 'true')
    expect(submit).toHaveTextContent('Creating…')

    expect(
      await screen.findByText(/Session “Sunday Shooting Clinic” was created\./),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Discoverable: the list refetches and shows exactly one new session.
    expect(await screen.findByText('6 sessions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sunday Shooting Clinic' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Session' })).toBeInTheDocument()
  })

  it('keeps every entered value when the server fails', async () => {
    const { user } = renderApp({ scenario: 'create-error' })
    const dialog = await openCreateDialog(user)
    await fillValidForm(user, dialog)

    await user.click(within(dialog).getByRole('button', { name: 'Create Session' }))

    expect(await within(dialog).findByText(/Your entries are kept\./)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Create session' })).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Title' })).toHaveValue('Sunday Shooting Clinic')
    expect(within(dialog).getByRole('combobox', { name: 'Coach' })).toHaveValue('coach_01')
    expect(within(dialog).getByLabelText('Date')).toHaveValue('2026-08-20')
    expect(within(dialog).getByLabelText('Start time')).toHaveValue('18:30')
    expect(within(dialog).getByRole('spinbutton', { name: 'Capacity' })).toHaveValue(12)
    expect(within(dialog).getByRole('textbox', { name: 'Location name' })).toHaveValue('Riverside Gym')
    expect(within(dialog).getByRole('textbox', { name: 'Location address' })).toHaveValue('4 Mill Lane')
    // Recovery: the form can be submitted again.
    expect(within(dialog).getByRole('button', { name: 'Create Session' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
})

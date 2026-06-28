import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useThemeMock } = vi.hoisted(() => ({
  useThemeMock: vi.fn(),
}))

vi.mock('next-themes', () => ({
  useTheme: useThemeMock,
}))

import { ThemeToggle } from '@/components/theme-toggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders toggle button when theme is light', async () => {
    useThemeMock.mockReturnValue({ resolvedTheme: 'light', setTheme: vi.fn() })
    render(<ThemeToggle />)
    expect(await screen.findByRole('button', { name: 'Toggle theme' })).toBeInTheDocument()
  })

  it('has aria-pressed false when theme is light', async () => {
    useThemeMock.mockReturnValue({ resolvedTheme: 'light', setTheme: vi.fn() })
    render(<ThemeToggle />)
    expect(
      await screen.findByRole('button', { name: 'Toggle theme', pressed: false }),
    ).toBeInTheDocument()
  })

  it('renders toggle button when theme is dark', async () => {
    useThemeMock.mockReturnValue({ resolvedTheme: 'dark', setTheme: vi.fn() })
    render(<ThemeToggle />)
    expect(await screen.findByRole('button', { name: 'Toggle theme' })).toBeInTheDocument()
  })

  it('has aria-pressed true when theme is dark', async () => {
    useThemeMock.mockReturnValue({ resolvedTheme: 'dark', setTheme: vi.fn() })
    render(<ThemeToggle />)
    expect(
      await screen.findByRole('button', { name: 'Toggle theme', pressed: true }),
    ).toBeInTheDocument()
  })

  it('calls setTheme with "dark" when current theme is light', async () => {
    const setTheme = vi.fn()
    useThemeMock.mockReturnValue({ resolvedTheme: 'light', setTheme })
    const user = userEvent.setup()

    render(<ThemeToggle />)

    await user.click(await screen.findByRole('button', { name: 'Toggle theme' }))

    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme with "light" when current theme is dark', async () => {
    const setTheme = vi.fn()
    useThemeMock.mockReturnValue({ resolvedTheme: 'dark', setTheme })
    const user = userEvent.setup()

    render(<ThemeToggle />)

    await user.click(await screen.findByRole('button', { name: 'Toggle theme' }))

    expect(setTheme).toHaveBeenCalledWith('light')
  })
})

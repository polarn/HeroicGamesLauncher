import '@testing-library/jest-dom'
import React from 'react'

import { fireEvent, render } from '@testing-library/react'

import {
  resetTestTypes,
  test_context,
  test_game,
  test_plugin
} from 'src/test_helpers/testTypes'
import ContextProvider from 'src/state/ContextProvider'
import Header from './index'

interface Props {
  goTo: string
  numberOfGames: number
  renderBackButton: boolean
  title: string
}

// helper to render with specific props
function getHeader(props: Partial<Props> = {}) {
  const defaultProps: Props = {
    goTo: '/',
    numberOfGames: 0,
    renderBackButton: false,
    title: 'title'
  }

  return (
    <ContextProvider.Provider value={test_context.get()}>
      <Header {...{ ...defaultProps, ...props }} />
    </ContextProvider.Provider>
  )
}

describe('Header', () => {
  beforeEach(() => {
    resetTestTypes()
  })

  test('renders', () => {
    render(getHeader())
  })

  test('shows title', () => {
    const { getByTestId } = render(getHeader({ title: 'Test Title' }))
    const title = getByTestId('headerTitle')
    expect(title).toHaveTextContent('Test Title')
  })

  test('shows number of games', () => {
    // no games found
    const { rerender, getByTestId } = render(getHeader())
    let totalGames = getByTestId('totalGamesText')
    expect(totalGames).toHaveTextContent('nogames')

    // games found
    rerender(getHeader({ numberOfGames: 12345 }))
    totalGames = getByTestId('totalGamesText')
    expect(totalGames).toHaveTextContent('Total Games: 12345')
  })

  test('filtering games works', () => {
    test_context.set({
      data: [test_game.get(), test_plugin.get()],
      filter: 'all',
      gameUpdates: [test_plugin.get().app_name],
      handleFilter: jest.fn(),
      libraryStatus: [
        {
          appName: test_game.get().app_name,
          status: 'installing' as const
        },
        {
          appName: test_plugin.get().app_name,
          status: 'updating' as const
        }
      ]
    })

    const { rerender, getByTestId } = render(getHeader())

    const filters = [
      'all',
      'installed',
      'uninstalled',
      'downloading',
      'updates'
    ]

    // check that each filter entry for games is working.
    // Fixme: how we can avoid the rerender and wait for the useContext rerender trigger ?
    filters.forEach((value) => {
      test_context.set({ filter: value })
      rerender(getHeader())
      const select = getByTestId('games-filter')
      fireEvent.change(select, { target: { value } })
      expect(test_context.get().handleFilter).toBeCalledWith(value)
    })
  })

  test('filtering unreal works', () => {
    test_context.set({
      category: 'unreal',
      filter: 'all',
      handleFilter: jest.fn()
    })

    const { rerender, getByTestId } = render(getHeader())

    const filters = ['unreal', 'asset', 'plugin', 'project']

    // check that each filter entry for unreal is working.
    // Fixme: how we can avoid the rerender and wait for the useContext rerender trigger ?
    filters.forEach((value) => {
      test_context.set({ filter: value })
      rerender(getHeader())
      const select = getByTestId('games-filter')
      fireEvent.change(select, { target: { value } })
      expect(test_context.get().handleFilter).toBeCalledWith(value)
    })
  })

  test('selecting unreal version works', () => {
    test_context.set({
      category: 'unreal',
      filter: 'UE_',
      handleFilter: jest.fn(),
      layout: 'grid'
    })

    const { getByTestId } = render(getHeader())
    const ueVersionSelect = getByTestId('ueVersionSelect')
    fireEvent.change(ueVersionSelect, { target: { value: 'UE_4.17' } })
    expect(test_context.get().handleFilter).toBeCalledWith('UE_4.17')
  })
})

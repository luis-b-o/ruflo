import { render, screen, fireEvent } from '@testing-library/react'
import Terminal from './Terminal'

describe('Terminal Component', () => {
  it('renders initial welcome message', () => {
    render(<Terminal />)
    expect(screen.getByText('Claude Flow Terminal v2.0.0')).toBeInTheDocument()
    expect(screen.getByText('Type "help" for available commands')).toBeInTheDocument()
  })

  it('executes help command', () => {
    render(<Terminal />)
    const input = screen.getByRole('textbox')
    
    fireEvent.change(input, { target: { value: 'help' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    expect(screen.getByText('Available commands:')).toBeInTheDocument()
  })

  it('shows auto-completion suggestions', () => {
    render(<Terminal />)
    const input = screen.getByRole('textbox')
    
    fireEvent.change(input, { target: { value: 'sw' } })
    
    expect(screen.getByText('swarm status')).toBeInTheDocument()
  })

  it('navigates command history with arrow keys', () => {
    render(<Terminal />)
    const input = screen.getByRole('textbox')
    
    // Execute a command
    fireEvent.change(input, { target: { value: 'help' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    // Press up arrow to get previous command
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    
    expect(input.value).toBe('help')
  })

  it('clears terminal with clear command', () => {
    render(<Terminal />)
    const input = screen.getByRole('textbox')
    
    // Execute help command first
    fireEvent.change(input, { target: { value: 'help' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    // Clear terminal
    fireEvent.change(input, { target: { value: 'clear' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    
    // Welcome message should be gone
    expect(screen.queryByText('Claude Flow Terminal v2.0.0')).not.toBeInTheDocument()
  })
})
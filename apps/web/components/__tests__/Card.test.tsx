import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '../ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders complex children', () => {
    render(
      <Card>
        <h2>Title</h2>
        <p>Description</p>
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('applies md padding by default', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('p-4');
  });

  it('applies sm padding variant', () => {
    render(<Card padding="sm" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('p-3');
  });

  it('applies lg padding variant', () => {
    render(<Card padding="lg" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('p-6');
  });

  it('applies custom className alongside base styles', () => {
    render(<Card className="custom-card" data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('custom-card');
    expect(card.className).toContain('rounded-2xl');
  });

  it('applies base surface and border styles', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-surface/80');
    expect(card.className).toContain('border');
  });

  it('renders as a div element', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('DIV');
  });

  it('forwards additional HTML div attributes', () => {
    render(<Card id="my-card" aria-label="info card">Content</Card>);
    const card = screen.getByLabelText('info card');
    expect(card).toHaveAttribute('id', 'my-card');
  });
});

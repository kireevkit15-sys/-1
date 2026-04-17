import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../ui/Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies primary variant styles by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-accent');
  });

  it('applies secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-surface-light/80');
  });

  it('applies danger variant styles', () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-accent-red');
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies w-full class when fullWidth is true', () => {
    render(<Button fullWidth>Full width</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('w-full');
  });

  it('does not apply w-full class by default', () => {
    render(<Button>Normal width</Button>);
    const button = screen.getByRole('button');
    expect(button.className).not.toContain('w-full');
  });

  it('does not fire click when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has disabled attribute when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies pointer-events-none class when disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('disabled:pointer-events-none');
  });

  it('merges custom className with base styles', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
    expect(button.className).toContain('rounded-xl');
  });

  it('forwards additional HTML button attributes', () => {
    render(<Button type="submit" data-testid="submit-btn">Submit</Button>);
    const button = screen.getByTestId('submit-btn');
    expect(button).toHaveAttribute('type', 'submit');
  });

  // ── Size ────────────────────────────────────────────────────────────────

  it('defaults to md size (px-6 py-3)', () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-6');
    expect(button.className).toContain('py-3');
  });

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-3');
    expect(button.className).toContain('text-xs');
  });

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-8');
    expect(button.className).toContain('text-base');
  });

  // ── Loading ─────────────────────────────────────────────────────────────

  it('renders spinner when loading', () => {
    render(<Button loading>Saving…</Button>);
    const button = screen.getByRole('button');
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('sets aria-busy when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('disables button while loading even without disabled prop', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Loading</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  // ── Icons ───────────────────────────────────────────────────────────────

  it('renders leftIcon before children', () => {
    render(<Button leftIcon={<span data-testid="l-icon">L</span>}>Label</Button>);
    expect(screen.getByTestId('l-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('LLabel');
  });

  it('renders rightIcon after children', () => {
    render(<Button rightIcon={<span data-testid="r-icon">R</span>}>Label</Button>);
    expect(screen.getByTestId('r-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('LabelR');
  });

  it('hides rightIcon while loading (spinner replaces the leading glyph)', () => {
    render(
      <Button loading rightIcon={<span data-testid="r-icon">R</span>}>
        Label
      </Button>,
    );
    expect(screen.queryByTestId('r-icon')).not.toBeInTheDocument();
  });

  it('iconOnly hides children and uses square padding', () => {
    render(
      <Button iconOnly aria-label="Close" leftIcon={<span data-testid="only">×</span>}>
        hidden-label
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Close' });
    expect(screen.getByTestId('only')).toBeInTheDocument();
    expect(button).not.toHaveTextContent('hidden-label');
    expect(button.className).toContain('w-11');
    expect(button.className).toContain('h-11');
  });

  // ── New variants ────────────────────────────────────────────────────────

  it('applies ghost variant (transparent bg, no border colour)', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('border-transparent');
  });

  it('applies outline variant (accent border)', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('border-accent/40');
    expect(button.className).toContain('text-accent');
  });

  it('applies link variant (no active:scale, underline)', () => {
    render(<Button variant="link">Link</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('underline');
    expect(button.className).not.toContain('active:scale-95');
  });
});

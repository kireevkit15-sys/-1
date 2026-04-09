import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SideNav from '../layout/SideNav';

// Mock next/navigation
const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe('SideNav', () => {
  it('renders all main nav items', () => {
    mockUsePathname.mockReturnValue('/');

    render(<SideNav />);

    expect(screen.getByText('Главная')).toBeInTheDocument();
    expect(screen.getByText('Баттл')).toBeInTheDocument();
    expect(screen.getByText('Обучение')).toBeInTheDocument();
    expect(screen.getByText('Рейтинг')).toBeInTheDocument();
    expect(screen.getByText('Достижения')).toBeInTheDocument();
    expect(screen.getByText('Профиль')).toBeInTheDocument();
  });

  it('renders warmup link in bottom section', () => {
    mockUsePathname.mockReturnValue('/');

    render(<SideNav />);

    expect(screen.getByText('Разминка')).toBeInTheDocument();
  });

  it('renders РАЗУМ logo', () => {
    mockUsePathname.mockReturnValue('/');

    render(<SideNav />);

    expect(screen.getByText('РАЗУМ')).toBeInTheDocument();
  });

  it('has correct href for each nav item', () => {
    mockUsePathname.mockReturnValue('/');

    render(<SideNav />);

    expect(screen.getByText('Главная').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Баттл').closest('a')).toHaveAttribute('href', '/battle/new');
    expect(screen.getByText('Обучение').closest('a')).toHaveAttribute('href', '/learn');
    expect(screen.getByText('Рейтинг').closest('a')).toHaveAttribute('href', '/leaderboard');
    expect(screen.getByText('Достижения').closest('a')).toHaveAttribute('href', '/achievements');
    expect(screen.getByText('Профиль').closest('a')).toHaveAttribute('href', '/profile');
    expect(screen.getByText('Разминка').closest('a')).toHaveAttribute('href', '/warmup');
  });

  it('highlights active route for home page', () => {
    mockUsePathname.mockReturnValue('/');

    render(<SideNav />);

    const homeLink = screen.getByText('Главная').closest('a');
    expect(homeLink?.className).toContain('bg-accent/12');
    expect(homeLink?.className).toContain('text-accent');
  });

  it('highlights active route for /learn page', () => {
    mockUsePathname.mockReturnValue('/learn');

    render(<SideNav />);

    const learnLink = screen.getByText('Обучение').closest('a');
    expect(learnLink?.className).toContain('bg-accent/12');
    expect(learnLink?.className).toContain('text-accent');
  });

  it('highlights active route for nested path under /battle', () => {
    mockUsePathname.mockReturnValue('/battle/new');

    render(<SideNav />);

    const battleLink = screen.getByText('Баттл').closest('a');
    expect(battleLink?.className).toContain('bg-accent/12');
  });

  it('does not highlight non-active routes', () => {
    mockUsePathname.mockReturnValue('/learn');

    render(<SideNav />);

    const homeLink = screen.getByText('Главная').closest('a');
    expect(homeLink?.className).not.toContain('bg-accent/12');
    expect(homeLink?.className).toContain('text-text-secondary');
  });

  it('does not mark home as active when on another route', () => {
    mockUsePathname.mockReturnValue('/profile');

    render(<SideNav />);

    const homeLink = screen.getByText('Главная').closest('a');
    // Home uses exact match, so /profile should not activate it
    expect(homeLink?.className).not.toContain('bg-accent/12');
  });

  it('renders as an aside element', () => {
    mockUsePathname.mockReturnValue('/');

    const { container } = render(<SideNav />);

    expect(container.querySelector('aside')).toBeInTheDocument();
  });
});

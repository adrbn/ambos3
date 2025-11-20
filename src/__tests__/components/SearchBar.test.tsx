/**
 * SearchBar Component Tests
 * Example test suite showing how to test AMBOS components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchBar from '@/components/SearchBar';

describe('SearchBar', () => {
  const defaultProps = {
    onSearch: vi.fn(),
    language: 'fr' as const,
    currentQuery: '',
    searchTrigger: 0,
    selectedApi: 'mixed' as const,
    sourceMode: 'news' as const,
    onSourceModeChange: vi.fn(),
    osintSources: [],
    onOsintSourcesChange: vi.fn(),
    pressSources: ['newsapi', 'mediastack', 'gnews'],
    onPressSourcesChange: vi.fn(),
    militarySources: [],
    onMilitarySourcesChange: vi.fn(),
    enableQueryEnrichment: false,
  };

  it('renders search input', () => {
    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/entrez votre requête/i);
    expect(input).toBeInTheDocument();
  });

  it('calls onSearch when form is submitted', async () => {
    const onSearch = vi.fn();
    render(<SearchBar {...defaultProps} onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText(/entrez votre requête/i);
    const button = screen.getByRole('button', { name: /rechercher/i });
    
    fireEvent.change(input, { target: { value: 'cyber attack' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalled();
    });
  });

  it('prevents empty searches', () => {
    const onSearch = vi.fn();
    render(<SearchBar {...defaultProps} onSearch={onSearch} />);
    
    const button = screen.getByRole('button', { name: /rechercher/i });
    fireEvent.click(button);
    
    expect(onSearch).not.toHaveBeenCalled();
  });
});


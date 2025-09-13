import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import IntelligenceDashboard from '../IntelligenceDashboard';
import { MemoryRouter } from 'react-router-dom';

// Mock fetch API
global.fetch = jest.fn();

// Mock child components to isolate testing
jest.mock('../ConsensusVisualization', () => {
  return function MockConsensusVisualization({ data }) {
    return <div data-testid="consensus-visualization">{JSON.stringify(data)}</div>;
  };
});

jest.mock('../CompetitorStackRanking', () => {
  return function MockCompetitorStackRanking({ data }) {
    return <div data-testid="competitor-ranking">{JSON.stringify(data)}</div>;
  };
});

describe('IntelligenceDashboard', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockDashboardData = {
    topDomains: [
      { domain: 'example1.com', brand_strength: 95.5, rank: 1 },
      { domain: 'example2.com', brand_strength: 92.3, rank: 2 },
    ],
    recentAnalyses: [
      { 
        domain: 'newdomain.com', 
        analyzed_at: '2025-01-20T10:00:00Z',
        ai_summary: 'Innovative tech startup'
      },
    ],
    industryTrends: {
      Technology: { growth: 5.2, avg_strength: 82.3 },
      Finance: { growth: 3.1, avg_strength: 78.5 },
    },
    totalDomains: 1500,
    activeAnalyses: 25,
  };

  it('renders loading state initially', () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders dashboard data after loading', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('AI Brand Intelligence Dashboard')).toBeInTheDocument();
      expect(screen.getByText('example1.com')).toBeInTheDocument();
      expect(screen.getByText('95.5')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    });
  });

  it('displays statistics correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Domains')).toBeInTheDocument();
      expect(screen.getByText('1,500')).toBeInTheDocument();
      expect(screen.getByText('Active Analyses')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('refreshes data when refresh button is clicked', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockDashboardData,
          totalDomains: 1600,
        }),
      });

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1,500')).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('1,600')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('renders industry trends section', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Industry Trends')).toBeInTheDocument();
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('+5.2%')).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        topDomains: [],
        recentAnalyses: [],
        industryTrends: {},
        totalDomains: 0,
        activeAnalyses: 0,
      }),
    });

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no domains found/i)).toBeInTheDocument();
    });
  });

  it('navigates to domain detail on click', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    const { container } = render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const domainLink = screen.getByText('example1.com');
      expect(domainLink).toBeInTheDocument();
      
      // Check if it's wrapped in a Link component
      const linkElement = domainLink.closest('a');
      expect(linkElement).toHaveAttribute('href', '/domains/example1.com');
    });
  });

  it('auto-refreshes data at intervals', async () => {
    jest.useFakeTimers();

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockDashboardData,
          activeAnalyses: 30,
        }),
      });

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    // Fast-forward 30 seconds (auto-refresh interval)
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('displays recent analyses with proper formatting', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Analyses')).toBeInTheDocument();
      expect(screen.getByText('newdomain.com')).toBeInTheDocument();
      expect(screen.getByText('Innovative tech startup')).toBeInTheDocument();
    });
  });

  it('handles network failures with retry', async () => {
    fetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDashboardData,
      });

    render(
      <MemoryRouter>
        <IntelligenceDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('example1.com')).toBeInTheDocument();
    });
  });
});
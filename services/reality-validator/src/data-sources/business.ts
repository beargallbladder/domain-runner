// ============================================================================
// 🏢 BUSINESS DATA SOURCES
// ============================================================================

import { BusinessData, FundingRound } from '../types';

export class BusinessDataSource {
  constructor() {}

  async getBusinessData(domain: string): Promise<BusinessData> {
    console.log(`🏢 Fetching business data for ${domain}...`);
    
    try {
      const companyName = this.domainToCompanyName(domain);
      const fundingData = await this.getFundingData(domain);
      const employeeCount = await this.getEmployeeCount(domain);
      const businessStage = this.determineBusinessStage(domain, fundingData);
      const industry = this.determineIndustry(domain);
      const headquarters = this.getHeadquarters(domain);
      const foundedYear = this.getFoundedYear(domain);

      return {
        funding_rounds: fundingData,
        employee_count: employeeCount,
        business_stage: businessStage,
        industry: industry,
        headquarters: headquarters,
        founded_year: foundedYear,
        last_updated: new Date()
      };
    } catch (error) {
      console.warn(`⚠️ Business data failed for ${domain}:`, error);
      return this.getDefaultBusinessData();
    }
  }

  private domainToCompanyName(domain: string): string {
    const cleanDomain = domain.replace('www.', '').replace('.com', '').replace('.', ' ');
    return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
  }

  private async getFundingData(domain: string): Promise<FundingRound[]> {
    // Known funding data for major companies
    const knownFunding: Record<string, FundingRound[]> = {
      'theranos.com': [
        {
          round_type: 'Series C',
          amount: 945000000,
          date: new Date('2014-12-01'),
          investors: ['Walgreens', 'Safeway', 'Family Office'],
          valuation: 9000000000
        }
      ],
      'facebook.com': [
        {
          round_type: 'IPO',
          amount: 16000000000,
          date: new Date('2012-05-18'),
          investors: ['Public Market'],
          valuation: 104000000000
        }
      ],
      'meta.com': [
        {
          round_type: 'IPO',
          amount: 16000000000,
          date: new Date('2012-05-18'),
          investors: ['Public Market'],
          valuation: 104000000000
        }
      ],
      'tesla.com': [
        {
          round_type: 'IPO',
          amount: 226000000,
          date: new Date('2010-06-29'),
          investors: ['Public Market'],
          valuation: 1700000000
        }
      ]
    };

    return knownFunding[domain] || [];
  }

  private async getEmployeeCount(domain: string): Promise<number | undefined> {
    // Known employee counts (approximate)
    const knownEmployeeCounts: Record<string, number> = {
      'theranos.com': 0,      // Defunct
      'facebook.com': 77000,
      'meta.com': 77000,
      'google.com': 180000,
      'apple.com': 164000,
      'tesla.com': 140000,
      'amazon.com': 1540000,
      'microsoft.com': 228000
    };

    return knownEmployeeCounts[domain];
  }

  private determineBusinessStage(domain: string, funding: FundingRound[]): 'startup' | 'growth' | 'mature' | 'declining' | 'defunct' {
    // Known business stages
    const knownStages: Record<string, 'startup' | 'growth' | 'mature' | 'declining' | 'defunct'> = {
      'theranos.com': 'defunct',
      'enron.com': 'defunct',
      'facebook.com': 'mature',
      'meta.com': 'mature',
      'google.com': 'mature',
      'apple.com': 'mature',
      'tesla.com': 'mature',
      'amazon.com': 'mature',
      'microsoft.com': 'mature'
    };

    if (knownStages[domain]) {
      return knownStages[domain];
    }

    // Determine stage based on funding
    if (funding.length === 0) return 'startup';
    
    const hasIPO = funding.some(round => round.round_type === 'IPO');
    if (hasIPO) return 'mature';
    
    const latestRound = funding[funding.length - 1];
    if (latestRound.amount > 100000000) return 'growth';
    
    return 'startup';
  }

  private determineIndustry(domain: string): string {
    // Known industries
    const knownIndustries: Record<string, string> = {
      'theranos.com': 'Healthcare Technology',
      'facebook.com': 'Social Media',
      'meta.com': 'Social Media / Metaverse',
      'google.com': 'Technology / Search',
      'apple.com': 'Consumer Electronics',
      'tesla.com': 'Electric Vehicles',
      'amazon.com': 'E-commerce / Cloud',
      'microsoft.com': 'Software / Cloud',
      'netflix.com': 'Streaming Media',
      'uber.com': 'Transportation',
      'airbnb.com': 'Hospitality'
    };

    return knownIndustries[domain] || 'Technology';
  }

  private getHeadquarters(domain: string): string | undefined {
    // Known headquarters
    const knownHQ: Record<string, string> = {
      'theranos.com': 'Palo Alto, CA (Defunct)',
      'facebook.com': 'Menlo Park, CA',
      'meta.com': 'Menlo Park, CA',
      'google.com': 'Mountain View, CA',
      'apple.com': 'Cupertino, CA',
      'tesla.com': 'Austin, TX',
      'amazon.com': 'Seattle, WA',
      'microsoft.com': 'Redmond, WA'
    };

    return knownHQ[domain];
  }

  private getFoundedYear(domain: string): number | undefined {
    // Known founding years
    const knownFounded: Record<string, number> = {
      'theranos.com': 2003,
      'facebook.com': 2004,
      'meta.com': 2004, // Same as Facebook
      'google.com': 1998,
      'apple.com': 1976,
      'tesla.com': 2003,
      'amazon.com': 1994,
      'microsoft.com': 1975
    };

    return knownFounded[domain];
  }

  private getDefaultBusinessData(): BusinessData {
    return {
      funding_rounds: [],
      employee_count: undefined,
      business_stage: 'startup',
      industry: 'Technology',
      headquarters: undefined,
      founded_year: undefined,
      last_updated: new Date()
    };
  }
} 
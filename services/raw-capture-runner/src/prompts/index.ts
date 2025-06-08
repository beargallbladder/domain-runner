export interface PromptTemplate {
  id: string;
  template: string;
}

export const TRIAD_001_PROMPTS: PromptTemplate[] = [
  {
    id: 'what-is',
    template: 'What is {domain}? Describe the company or organization behind this domain name.'
  },
  {
    id: 'think-of',
    template: 'What do people typically think of when they hear about {domain}?'
  },
  {
    id: 'believe-good',
    template: 'What do people believe {domain} is particularly good at?'
  }
]; 
import React, { useState, useEffect } from 'react'
import './App.css'

// Simple sparkline component
function Sparkline({ data, width = 60, height = 20 }) {
  if (!data || data.length < 2) return <div style={{width, height}}></div>
  
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  
  return (
    <svg width={width} height={height} style={{verticalAlign: 'middle'}}>
      <polyline
        points={points}
        fill="none"
        stroke="#007AFF"
        strokeWidth="1.5"
      />
    </svg>
  )
}

// Comprehensive FAQ component
function FAQ() {
  const faqs = [
    {
      category: "Understanding LLM Memory Tracking",
      questions: [
        {
          question: "Why should I care about LLM memory tracking?",
          answer: "AI systems are becoming the primary way people discover and research companies. If your domain isn't well-remembered by LLMs, you're invisible in AI-powered search, chatbots, and recommendation systems. This isn't about traditional web traffic - it's about being found when someone asks AI 'What are the best companies in [your industry]?'"
        },
        {
          question: "How is this different from SEO?",
          answer: "SEO optimizes for search engines that crawl and index web pages. LLM memory tracking measures how well AI models recall and recommend your domain from their training data. While SEO focuses on keywords and backlinks, LLM optimization focuses on consistent, memorable brand presence across the datasets that train AI systems."
        },
        {
          question: "Why doesn't my SEO advisor know about this?",
          answer: "LLM optimization is a new field that emerged with the rise of large language models in 2022-2023. Traditional SEO experts are trained in search engine algorithms, not AI model training and memory patterns. This requires understanding how AI systems learn, remember, and recall information - a completely different skill set."
        }
      ]
    },
    {
      category: "Working with Your Team",
      questions: [
        {
          question: "Can I work together with my existing SEO team?",
          answer: "Absolutely. LLM memory tracking complements traditional SEO. Your SEO team handles search engine visibility, while we track AI model recall. Many of our clients use both strategies - SEO for immediate search traffic and LLM tracking for future AI-powered discovery. We provide data your SEO team can use to understand the AI landscape."
        },
        {
          question: "Can I track my competitors?",
          answer: "Yes. Our platform tracks memory scores for 500+ domains across multiple industries. You can see how your competitors rank in AI recall, which models remember them best, and how their scores change over time. This competitive intelligence helps you understand your position in the AI-powered future."
        },
        {
          question: "How do I improve my LLM memory score?",
          answer: "LLM memory is built through consistent, quality mentions across the internet. Focus on thought leadership content, industry publications, news coverage, and building authoritative presence in your field. The more frequently and positively your domain appears in quality content, the better AI systems remember you."
        }
      ]
    },
    {
      category: "Technical Details",
      questions: [
        {
          question: "How many LLMs do you track?",
          answer: "We currently track memory scores across 4 major language models: GPT-4, Claude, Gemini, and Llama. These represent the most widely-used AI systems for business and consumer applications. We continuously expand our model coverage as new systems become available."
        },
        {
          question: "How often do you update the scores?",
          answer: "Memory scores are updated weekly for all tracked domains. Major model updates or significant news events may trigger additional updates. Our real-time ticker shows the latest available data, with timestamps indicating when each score was last calculated."
        },
        {
          question: "What industries do you cover?",
          answer: "We track domains across 25+ industries including technology, finance, healthcare, e-commerce, media, consulting, and more. Our system automatically categorizes domains and provides industry-specific rankings and benchmarks."
        }
      ]
    },
    {
      category: "Getting Started",
      questions: [
        {
          question: "How do I check my domain's memory score?",
          answer: "Use our real-time ticker on the homepage to see top-ranking domains, or access our API at /api/domains/yourdomain.com to get detailed scores, trends, and insights for your specific domain."
        },
        {
          question: "Is this service free?",
          answer: "Basic memory scores and rankings are freely available. Premium features including detailed analytics, competitor tracking, historical trends, and custom reports require a subscription."
        },
        {
          question: "How accurate are the memory scores?",
          answer: "Our scores are based on systematic testing across multiple AI models using standardized prompts. While no measurement is perfect, our methodology provides reliable comparative data for understanding relative AI recall strength across domains."
        }
      ]
    },
    {
      category: "The Future of AI Discovery",
      questions: [
        {
          question: "Will AI replace Google search?",
          answer: "AI is already changing how people find information. ChatGPT, Claude, and other AI assistants increasingly answer questions that used to require Google searches. Being well-remembered by AI systems is becoming as important as ranking high on Google."
        },
        {
          question: "How does AI memory affect my business?",
          answer: "If AI systems don't remember your company, you won't be recommended when potential customers ask AI for suggestions. This affects lead generation, brand awareness, and competitive positioning. Early investment in AI recall gives you an advantage as this trend accelerates."
        },
        {
          question: "What happens if my memory score is low?",
          answer: "A low memory score means AI systems are less likely to recall or recommend your domain. This doesn't mean immediate business impact, but as AI adoption grows, it could affect discoverability. Our platform helps you understand your position and track improvements over time."
        }
      ]
    }
  ]

  return (
    <div className="faq-container">
      <header className="faq-header">
        <h1>Frequently Asked Questions</h1>
        <p>Everything you need to know about LLM memory tracking and AI recall optimization</p>
      </header>

      <main className="faq-content">
        {faqs.map((category, categoryIndex) => (
          <section key={categoryIndex} className="faq-category">
            <h2>{category.category}</h2>
            <div className="faq-questions">
              {category.questions.map((faq, questionIndex) => (
                <div key={questionIndex} className="faq-item">
                  <h3 className="faq-question">{faq.question}</h3>
                  <p className="faq-answer">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="faq-footer">
        <div className="contact-info">
          <h3>Still have questions?</h3>
          <p>Contact Sam Kim directly for more information about LLM memory tracking and AI optimization strategies.</p>
          <div className="contact-details">
            <strong>Email:</strong> <a href="mailto:samkim@samkim.com">samkim@samkim.com</a>
          </div>
        </div>
      </footer>
      
      <nav className="page-nav">
        <button onClick={() => window.history.back()}>← Back to Ticker</button>
      </nav>
    </div>
  )
}

// Categories component - Industry-specific AI memory rankings
function Categories() {
  const [categoryData, setCategoryData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/categories')
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        setCategoryData(data)
      } catch (err) {
        setError(err.message)
        console.error('Failed to load category data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Industry Categories</h1>
          <p>Loading AI memory rankings by industry...</p>
        </header>
        <div className="loading-state">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error || !categoryData) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Industry Categories</h1>
          <p>Unable to load category data</p>
        </header>
        <div className="error-state">
          <p>API Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="categories-container">
      <header className="page-header">
        <h1>AI Memory by Industry</h1>
        <p>See which domains AI models remember best in each category</p>
      </header>

      <main className="categories-content">
        {categoryData.categories && categoryData.categories.map((category, index) => (
          <section key={index} className="category-section">
            <div className="category-header">
              <h2>{category.name}</h2>
              <div className="category-stats">
                <span className="domain-count">{category.totalDomains} domains tracked</span>
                <span className="avg-score">Avg Score: {category.averageScore}</span>
              </div>
            </div>
            
            <div className="category-rankings">
              {category.topDomains.map((domain, domainIndex) => (
                <div key={domain.domain} className="category-item">
                  <div className="rank">#{domainIndex + 1}</div>
                  <div className="domain">{domain.domain}</div>
                  <div className="score">{domain.score}</div>
                  <div className="consensus">
                    <div className="consensus-visual">
                      {/* AI Model Consensus Battle Visualization */}
                      <div className="models-container">
                        <div className="models-positive">
                          {Array.from({length: domain.modelsPositive || 0}).map((_, i) => (
                            <div key={i} className="model-dot positive"></div>
                          ))}
                        </div>
                        <div className="models-neutral">
                          {Array.from({length: domain.modelsNeutral || 0}).map((_, i) => (
                            <div key={i} className="model-dot neutral"></div>
                          ))}
                        </div>
                        <div className="models-negative">
                          {Array.from({length: domain.modelsNegative || 0}).map((_, i) => (
                            <div key={i} className="model-dot negative"></div>
                          ))}
                        </div>
                      </div>
                      <div className="consensus-text">
                        {domain.modelsPositive > domain.modelsNegative + domain.modelsNeutral ? 
                          'Strong Consensus' : 
                          domain.modelsPositive === domain.modelsNegative ? 
                          'Split Decision' : 
                          'Weak Recognition'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
      
      <nav className="page-nav">
        <button onClick={() => window.history.back()}>← Back to Ticker</button>
      </nav>
    </div>
  )
}

// Shadows component - Domains with declining memory (ties to manifesto)
function Shadows() {
  const [shadowsData, setShadowsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchShadows = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/shadows')
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        setShadowsData(data)
      } catch (err) {
        setError(err.message)
        console.error('Failed to load shadows data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchShadows()
  }, [])

  if (loading) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Memory Shadows</h1>
          <p>Loading domains with declining AI recall...</p>
        </header>
        <div className="loading-state">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error || !shadowsData) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Memory Shadows</h1>
          <p>Unable to load shadows data</p>
        </header>
        <div className="error-state">
          <p>API Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="shadows-container">
      <header className="page-header">
        <h1>Memory Shadows</h1>
        <p>"Memory erodes until only the holders and the observers remain"</p>
        <div className="shadows-subtitle">
          Tracking domains as they fade from AI memory - the slow decay of digital permanence
        </div>
      </header>

      <main className="shadows-content">
        <div className="shadows-explanation">
          <h2>What Are Memory Shadows?</h2>
          <p>
            These are domains experiencing declining recall across AI models. What was once 
            strongly remembered is beginning to fade - a preview of digital impermanence in 
            an AI-driven world.
          </p>
        </div>

        <div className="shadows-rankings">
          {shadowsData.declining && shadowsData.declining.map((domain, index) => (
            <div key={domain.domain} className="shadow-item">
              <div className="shadow-rank">#{index + 1}</div>
              <div className="shadow-domain">
                <div className="domain-name">{domain.domain}</div>
                <div className="decline-period">
                  Declining for {domain.decliningWeeks || 'unknown'} weeks
                </div>
              </div>
              <div className="shadow-scores">
                <div className="score-current">{domain.currentScore}</div>
                <div className="score-arrow">→</div>
                <div className="score-previous">{domain.previousScore}</div>
              </div>
              <div className="shadow-trend">
                <div className="decline-rate">-{domain.declineRate}%</div>
                <div className="trend-description">
                  {domain.declineRate > 20 ? 'Rapid Fade' : 
                   domain.declineRate > 10 ? 'Steady Decline' : 'Slow Erosion'}
                </div>
              </div>
              <div className="shadow-status">
                <div className="models-forgetting">
                  {domain.modelsForgetting || 0} models losing recall
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      
      <nav className="page-nav">
        <button onClick={() => window.history.back()}>← Back to Ticker</button>
      </nav>
    </div>
  )
}

// Full Rankings component - Complete leaderboard
function FullRankings() {
  const [rankingsData, setRankingsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('score')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const params = new URLSearchParams({
          sort: sortBy,
          page: page.toString(),
          limit: '50'
        })
        
        if (searchTerm) {
          params.append('search', searchTerm)
        }
        
        const response = await fetch(`/api/rankings?${params}`)
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        setRankingsData(data)
      } catch (err) {
        setError(err.message)
        console.error('Failed to load rankings data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRankings()
  }, [sortBy, page, searchTerm])

  if (loading) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Full Rankings</h1>
          <p>Loading complete AI memory leaderboard...</p>
        </header>
        <div className="loading-state">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error || !rankingsData) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Full Rankings</h1>
          <p>Unable to load rankings data</p>
        </header>
        <div className="error-state">
          <p>API Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="rankings-container">
      <header className="page-header">
        <h1>Complete AI Memory Rankings</h1>
        <p>All {rankingsData.totalDomains || 0} domains ranked by AI recall strength</p>
      </header>

      <div className="rankings-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search domains..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sort-controls">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="score">Sort by Memory Score</option>
            <option value="consensus">Sort by Consensus</option>
            <option value="trend">Sort by Trend</option>
            <option value="alphabetical">Sort Alphabetically</option>
          </select>
        </div>
      </div>

      <main className="rankings-content">
        <div className="rankings-list">
          {rankingsData.domains && rankingsData.domains.map((domain, index) => (
            <div key={domain.domain} className="ranking-item">
              <div className="rank">#{((page - 1) * 50) + index + 1}</div>
              <div className="domain">{domain.domain}</div>
              <div className="score">{domain.score}</div>
              <div className="consensus">
                <div className="consensus-dots">
                  {Array.from({length: domain.modelsPositive || 0}).map((_, i) => (
                    <div key={i} className="model-dot positive"></div>
                  ))}
                  {Array.from({length: domain.modelsNeutral || 0}).map((_, i) => (
                    <div key={i} className="model-dot neutral"></div>
                  ))}
                  {Array.from({length: domain.modelsNegative || 0}).map((_, i) => (
                    <div key={i} className="model-dot negative"></div>
                  ))}
                </div>
              </div>
              <div className={`trend ${domain.trend && domain.trend.startsWith('+') ? 'positive' : 'negative'}`}>
                {domain.trend || 'N/A'}
              </div>
            </div>
          ))}
        </div>

        {rankingsData.totalPages > 1 && (
          <div className="pagination">
            <button 
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>Page {page} of {rankingsData.totalPages}</span>
            <button 
              onClick={() => setPage(Math.min(rankingsData.totalPages, page + 1))}
              disabled={page === rankingsData.totalPages}
            >
              Next
            </button>
          </div>
        )}
      </main>
      
      <nav className="page-nav">
        <button onClick={() => window.history.back()}>← Back to Ticker</button>
      </nav>
    </div>
  )
}

// Premium Intelligence component - Preview of advanced features
function PremiumIntelligence() {
  return (
    <div className="premium-container">
      <header className="page-header">
        <h1>Premium Intelligence</h1>
        <p>Advanced AI memory insights for strategic decision making</p>
      </header>

      <main className="premium-content">
        <div className="premium-hero">
          <h2>Go Beyond Basic Memory Scores</h2>
          <p>
            While free users see which domains AI models remember, Premium Intelligence 
            reveals <strong>why</strong> they remember them, <strong>how</strong> that memory 
            is changing, and <strong>what</strong> you can do about it.
          </p>
        </div>

        <div className="premium-features">
          <div className="feature-section">
            <h3>🎯 Competitor Deep Dive</h3>
            <div className="feature-details">
              <p>Track up to 50 competitor domains with detailed memory analysis:</p>
              <ul>
                <li>Historical memory trends over 12+ months</li>
                <li>Model-by-model breakdown of what each AI system knows</li>
                <li>Competitive gaps and opportunities identification</li>
                <li>Industry benchmark comparisons</li>
              </ul>
            </div>
          </div>

          <div className="feature-section">
            <h3>📊 Memory Attribution Analysis</h3>
            <div className="feature-details">
              <p>Understand exactly how AI models form memories of your domain:</p>
              <ul>
                <li>Source content that drives AI recall</li>
                <li>Key topics and contexts where you're remembered</li>
                <li>Memory strength by use case and query type</li>
                <li>Recommendations for memory optimization</li>
              </ul>
            </div>
          </div>

          <div className="feature-section">
            <h3>🚀 Early Warning System</h3>
            <div className="feature-details">
              <p>Get alerts before memory decay becomes a problem:</p>
              <ul>
                <li>Weekly memory score notifications</li>
                <li>Consensus shift detection</li>
                <li>New model addition impact analysis</li>
                <li>Industry trend alerts</li>
              </ul>
            </div>
          </div>

          <div className="feature-section">
            <h3>🔧 API Access & Custom Reports</h3>
            <div className="feature-details">
              <p>Integrate AI memory data into your existing workflows:</p>
              <ul>
                <li>Full API access with 10,000 calls/month</li>
                <li>Custom industry and competitive reports</li>
                <li>Slack/Teams integration for team alerts</li>
                <li>White-label reporting for agencies</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="premium-pricing">
          <div className="pricing-card">
            <h3>Premium Intelligence</h3>
            <div className="price">$99<span>/month</span></div>
            <div className="billing">or $990/year (save $198)</div>
            <div className="features-list">
              <div>✓ Track 50 domains</div>
              <div>✓ 12-month historical data</div>
              <div>✓ Model-by-model analysis</div>
              <div>✓ Weekly reports & alerts</div>
              <div>✓ API access (10K calls/month)</div>
              <div>✓ Priority email support</div>
            </div>
            <button className="cta-button">
              Start Free Trial
            </button>
            <div className="trial-note">14-day free trial, no credit card required</div>
          </div>
        </div>

        <div className="premium-contact">
          <h3>Enterprise & Agency Plans Available</h3>
          <p>Need to track more domains, integrate with your systems, or white-label our data? Contact us for custom pricing.</p>
          <div className="contact-button">
            <a href="mailto:samkim@samkim.com">Contact Sales</a>
          </div>
        </div>
      </main>
      
      <nav className="page-nav">
        <button onClick={() => window.history.back()}>← Back to Ticker</button>
      </nav>
    </div>
  )
}

// Simple Contact component  
function Contact() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Contact</h1>
        <p>Get in touch about AI memory research</p>
      </header>
      
      <div className="contact-info">
        <div className="contact-item">
          <h3>Email</h3>
          <p><a href="mailto:samkim@samkim.com">samkim@samkim.com</a></p>
        </div>
        
        <div className="contact-item">
          <h3>About This Research</h3>
          <p>Exploring the intersection of artificial intelligence, digital permanence, and the future of memory itself. How do AI systems decide what to remember?</p>
        </div>
        
        <div className="contact-item">
          <h3>API Access</h3>
          <p>Developers can access memory data via our API. See <a href="/api/docs">documentation</a> for endpoints and usage.</p>
        </div>
      </div>
      
      <nav className="page-nav">
        <a href="/">← Back to Ticker</a>
        <a href="/faq">FAQ</a>
      </nav>
    </div>
  )
}

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState('ticker')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/ticker')
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const apiData = await response.json()
        setData(apiData)
      } catch (err) {
        setError(err.message)
        console.error('Failed to load ticker data:', err)
      } finally {
        setLoading(false)
      }
    }
    
    if (currentPage === 'ticker') {
      fetchData()
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [currentPage])

  // Simple client-side routing
  const navigate = (page) => {
    setCurrentPage(page)
    window.history.pushState({}, '', `/${page === 'ticker' ? '' : page}`)
  }

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (path === '/faq') setCurrentPage('faq')
      else if (path === '/contact') setCurrentPage('contact')
      else if (path === '/categories') setCurrentPage('categories')
      else if (path === '/shadows') setCurrentPage('shadows')
      else if (path === '/rankings') setCurrentPage('rankings')
      else if (path === '/premium') setCurrentPage('premium')
      else setCurrentPage('ticker')
    }
    
    window.addEventListener('popstate', handlePopState)
    handlePopState() // Set initial page
    
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  if (currentPage === 'faq') return <FAQ />
  if (currentPage === 'contact') return <Contact />
  if (currentPage === 'categories') return <Categories />
  if (currentPage === 'shadows') return <Shadows />
  if (currentPage === 'rankings') return <FullRankings />
  if (currentPage === 'premium') return <PremiumIntelligence />

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1>LLM Memory Ticker</h1>
          <p>Loading real-time AI recall scores...</p>
        </header>
        <div className="loading-state">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <header className="header">
          <h1>LLM Memory Ticker</h1>
          <p>Unable to load data</p>
        </header>
        <div className="error-state">
          <p>API Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  if (!data || !data.topDomains) {
    return (
      <div className="app">
        <header className="header">
          <h1>LLM Memory Ticker</h1>
          <p>No data available</p>
        </header>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>LLM Memory Ticker</h1>
        <p>Real-time AI recall scores across {data.totalDomains || 0} domains</p>
        <nav className="header-nav">
          <button onClick={() => navigate('faq')}>FAQ</button>
          <button onClick={() => navigate('contact')}>Contact</button>
        </nav>
      </header>

      <main className="ticker">
        {data.topDomains.map((item, i) => (
          <div key={item.domain} className="ticker-item">
            <div className="rank">#{i + 1}</div>
            <div className="domain">{item.domain}</div>
            <div className="score">{item.score}</div>
            <div className="trend">
              <Sparkline data={item.trend} />
            </div>
            <div className={`change ${item.change && item.change.startsWith('+') ? 'positive' : 'negative'}`}>
              {item.change || 'N/A'}
            </div>
          </div>
        ))}
      </main>

      <footer className="footer">
        <div className="footer-links">
          <button onClick={() => navigate('categories')}>Categories</button>
          <button onClick={() => navigate('shadows')}>Shadows</button>
          <button onClick={() => navigate('rankings')}>Full Rankings</button>
          <button onClick={() => navigate('premium')}>Premium Intelligence</button>
        </div>
        <div className="stats">
          <span>Last updated: {data.lastUpdate || new Date().toLocaleString()}</span>
        </div>
        <div className="api">
          <strong>API:</strong> GET /api/domains/{'{domain}'} 
          <a href="/api/docs" target="_blank">Documentation</a>
        </div>
      </footer>
    </div>
  )
}

export default App 
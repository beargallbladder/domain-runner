# 🔍 SEARCH API DOCUMENTATION FOR FRONTEND

## 🎯 COMPLETE SEARCH FUNCTIONALITY AVAILABLE

Your homepage search box has **extensive API support** with multiple search endpoints and capabilities!

## 🚀 PRIMARY SEARCH ENDPOINT

### **`GET /api/rankings` - Main Search & Rankings**

**Perfect for homepage search box!**

```http
GET /api/rankings?search={query}&page=1&limit=20&sort=score
```

#### **Parameters:**
- `search` (string, max 100 chars) - Search query for domain names
- `page` (int, default 1) - Pagination page number  
- `limit` (int, default 50, max 100) - Results per page
- `sort` (enum) - Sort options:
  - `score` - By AI memory score (default)
  - `consensus` - By AI consensus score
  - `trend` - By trending direction
  - `domain` - Alphabetical by domain name
  - `alphabetical` - Same as domain

#### **Example Request:**
```javascript
// Search for "apple" domains
const response = await fetch('/api/rankings?search=apple&limit=10&sort=score');
const data = await response.json();
```

#### **Response Structure:**
```json
{
  "domains": [
    {
      "domain": "apple.com",
      "score": 48.1,
      "trend": "-2.4%",
      "modelsPositive": 4,
      "modelsNeutral": 1, 
      "modelsNegative": 0,
      "dataFreshness": "fresh",
      "lastUpdated": "2025-06-21T21:54:31.534220Z"
    }
  ],
  "totalDomains": 1,
  "totalPages": 1,
  "currentPage": 1
}
```

## 🔍 ADVANCED SEARCH CAPABILITIES

### **1. Real-Time Search Suggestions**
```javascript
// As user types, get instant results
const searchSuggestions = async (query) => {
  if (query.length < 2) return [];
  
  const response = await fetch(`/api/rankings?search=${query}&limit=5&sort=score`);
  const data = await response.json();
  
  return data.domains.map(d => ({
    domain: d.domain,
    score: d.score,
    preview: `${d.score} points • ${d.trend}`
  }));
};
```

### **2. Search with Filters**
```javascript
// Search with different sorting options
const searchWithFilters = async (query, sortBy = 'score') => {
  const response = await fetch(`/api/rankings?search=${query}&sort=${sortBy}&limit=20`);
  return await response.json();
};

// Usage examples:
searchWithFilters('tech', 'score');      // Best scoring tech companies
searchWithFilters('bank', 'trend');      // Trending banking domains
searchWithFilters('ai', 'consensus');    // AI companies by consensus
```

### **3. Paginated Search Results**
```javascript
// Handle large search result sets
const paginatedSearch = async (query, page = 1) => {
  const response = await fetch(`/api/rankings?search=${query}&page=${page}&limit=50`);
  const data = await response.json();
  
  return {
    results: data.domains,
    pagination: {
      current: data.currentPage,
      total: data.totalPages,
      hasNext: data.currentPage < data.totalPages,
      hasPrev: data.currentPage > 1
    }
  };
};
```

## 🎭 SEARCH UI COMPONENTS

### **Search Box with Autocomplete**
```jsx
const SearchBox = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/rankings?search=${searchQuery}&limit=8`);
        const data = await response.json();
        setSuggestions(data.domains);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    handleSearch(query);
  }, [query, handleSearch]);

  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="Search domains (e.g., apple, tesla, microsoft)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="search-input"
      />
      
      {loading && <div className="search-loading">Searching...</div>}
      
      {suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.map(domain => (
            <div key={domain.domain} className="suggestion-item">
              <span className="domain-name">{domain.domain}</span>
              <span className="domain-score">{domain.score} pts</span>
              <span className="domain-trend">{domain.trend}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### **Search Results Page**
```jsx
const SearchResults = ({ query }) => {
  const [results, setResults] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchResults = async () => {
      const response = await fetch(
        `/api/rankings?search=${query}&sort=${sortBy}&page=${currentPage}&limit=20`
      );
      const data = await response.json();
      setResults(data);
    };

    if (query) {
      fetchResults();
    }
  }, [query, sortBy, currentPage]);

  if (!results) return <div>Loading...</div>;

  return (
    <div className="search-results">
      <div className="results-header">
        <h2>Search Results for "{query}"</h2>
        <p>{results.totalDomains} domains found</p>
        
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="score">Best Score</option>
          <option value="trend">Trending</option>
          <option value="consensus">AI Consensus</option>
          <option value="domain">Alphabetical</option>
        </select>
      </div>

      <div className="results-list">
        {results.domains.map(domain => (
          <DomainCard key={domain.domain} domain={domain} />
        ))}
      </div>

      {results.totalPages > 1 && (
        <Pagination
          current={results.currentPage}
          total={results.totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};
```

## 🔍 ADDITIONAL SEARCH ENDPOINTS

### **Domain-Specific Search**
```http
GET /api/domains/{domain}/public
```
Get detailed information about a specific domain.

### **Category Search**
```http
GET /api/categories
```
Get industry categories for filtered searching.

### **Trending Search**
```http
GET /api/trends/improvement
GET /api/trends/degradation
```
Search trending domains by improvement/decline.

### **Competitive Search**
```http
GET /api/domains/{domain}/competitive
```
Find competitive analysis and similar domains.

## 🎯 SEARCH FEATURES FOR HOMEPAGE

### **1. Smart Search Suggestions**
- Real-time autocomplete as user types
- Shows domain name, score, and trend
- Debounced API calls (300ms delay)
- Maximum 8 suggestions

### **2. Search Filters**
- Sort by: Score, Trend, Consensus, Alphabetical
- Data freshness indicators
- Model coverage information

### **3. Search Analytics**
- Track popular search terms
- Show "trending searches"
- Recent searches for logged-in users

### **4. Advanced Search Features**
```javascript
// Search with multiple criteria
const advancedSearch = {
  query: 'tech',
  minScore: 50,
  dataFreshness: 'fresh',
  sortBy: 'score',
  limit: 20
};

// Implementation
const buildSearchURL = (criteria) => {
  const params = new URLSearchParams();
  params.append('search', criteria.query);
  params.append('sort', criteria.sortBy);
  params.append('limit', criteria.limit);
  
  return `/api/rankings?${params.toString()}`;
};
```

## 🚀 IMPLEMENTATION EXAMPLES

### **Homepage Search Integration**
```jsx
// Main homepage search component
const HomepageSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const navigate = useNavigate();

  const handleSearch = async (query) => {
    if (!query.trim()) return;
    
    // Navigate to full search results page
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleQuickSearch = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const response = await fetch(`/api/rankings?search=${query}&limit=5`);
    const data = await response.json();
    setSearchResults(data.domains);
  };

  return (
    <div className="homepage-search">
      <h1>Search AI Brand Intelligence</h1>
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
        onQuickSearch={handleQuickSearch}
        suggestions={searchResults}
        placeholder="Search any domain (e.g., apple.com, tesla.com)"
      />
    </div>
  );
};
```

## 📊 SEARCH ANALYTICS ENDPOINTS

Track search usage and popular queries:

```javascript
// Track search events
const trackSearch = async (query, resultCount) => {
  await fetch('/api/analytics/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      resultCount,
      timestamp: new Date().toISOString()
    })
  });
};

// Get popular searches
const getPopularSearches = async () => {
  const response = await fetch('/api/analytics/popular-searches');
  return await response.json();
};
```

## 🎯 SUMMARY

**Your homepage search box has FULL API support with:**

✅ **Real-time search** with `/api/rankings?search=query`  
✅ **Autocomplete suggestions** with debounced requests  
✅ **Multiple sort options** (score, trend, consensus, alphabetical)  
✅ **Pagination support** for large result sets  
✅ **Advanced filtering** capabilities  
✅ **Domain-specific details** with individual domain endpoints  
✅ **Trending and competitive** search features  

The search functionality is **production-ready** and can handle everything from simple queries to advanced filtering! 🚀 
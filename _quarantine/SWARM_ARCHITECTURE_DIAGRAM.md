# Domain Runner Swarm Architecture Diagram

## System Overview Diagram

```mermaid
graph TB
    subgraph "External Interfaces"
        UI[llmpagerank.com<br/>Frontend]
        API[API Consumers<br/>Partners]
        CRON[Scheduler<br/>Weekly Triggers]
    end

    subgraph "Master Coordinator"
        MC[Master Swarm<br/>Orchestrator]
    end

    subgraph "Collection Swarm"
        CO[Collection<br/>Orchestrator]
        PHM[Provider Health<br/>Monitor]
        DV[Data<br/>Validator]
        RM[Retry<br/>Manager]
        BO[Batch<br/>Optimizer]
        
        CO --> PHM
        CO --> DV
        CO --> RM
        CO --> BO
    end

    subgraph "Intelligence Swarm"
        IO[Intelligence<br/>Orchestrator]
        MSC[Memory Score<br/>Calculator]
        DPA[Drift Pattern<br/>Analyzer]
        CA[Consensus<br/>Analyzer]
        CIA[Competitive<br/>Intelligence]
        TCE[Tensor<br/>Engine]
        
        IO --> MSC
        IO --> DPA
        IO --> CA
        IO --> CIA
        MSC --> TCE
        DPA --> TCE
        CA --> TCE
    end

    subgraph "API Swarm"
        AGM[API Gateway<br/>Manager]
        COA[Cache<br/>Optimizer]
        RF[Response<br/>Formatter]
        UAA[Usage<br/>Analytics]
        SLA[SLA<br/>Monitor]
        
        AGM --> COA
        AGM --> RF
        AGM --> UAA
        AGM --> SLA
    end

    subgraph "Security Swarm"
        SO[Security<br/>Orchestrator]
        AV[Access<br/>Validator]
        AD[Anomaly<br/>Detector]
        AL[Audit<br/>Logger]
        KLM[Key Lifecycle<br/>Manager]
        
        SO --> AV
        SO --> AD
        SO --> AL
        SO --> KLM
    end

    subgraph "Operations Swarm"
        SRO[Site Reliability<br/>Orchestrator]
        HM[Health<br/>Monitor]
        PA[Performance<br/>Analyzer]
        COP[Cost<br/>Optimizer]
        CP[Capacity<br/>Planner]
        
        SRO --> HM
        SRO --> PA
        SRO --> COP
        SRO --> CP
    end

    subgraph "Pipeline Swarm"
        PO[Pipeline<br/>Orchestrator]
        BM[Batch<br/>Manager]
        WC[Worker<br/>Coordinator]
        RO[Resource<br/>Optimizer]
        
        PO --> BM
        PO --> WC
        PO --> RO
    end

    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Database)]
        REDIS[(Redis<br/>Cache/PubSub)]
        
        subgraph "Core Tables"
            DT[domains]
            DRT[domain_responses]
            VST[volatility_scores]
            PAK[partner_api_keys]
        end
    end

    subgraph "LLM Providers"
        OAI[OpenAI]
        ANT[Anthropic]
        DS[DeepSeek]
        MIS[Mistral]
        XAI[xAI]
        TOG[Together]
        PER[Perplexity]
        GOO[Google]
        COH[Cohere]
        A21[AI21]
        GRO[Groq]
    end

    %% Master Coordination
    CRON --> MC
    MC --> CO
    MC --> IO
    MC --> AGM
    MC --> SO
    MC --> SRO
    MC --> PO

    %% Data Flow
    CO --> DB
    DB --> IO
    IO --> DB
    DB --> AGM
    API --> AGM
    UI --> AGM

    %% Collection Flow
    CO --> OAI
    CO --> ANT
    CO --> DS
    CO --> MIS
    CO --> XAI
    CO --> TOG
    CO --> PER
    CO --> GOO
    CO --> COH
    CO --> A21
    CO --> GRO

    %% Inter-Swarm Communication
    CO -.->|data.collection.complete| REDIS
    IO -.->|intelligence.insight.generated| REDIS
    AGM -.->|api.request.received| REDIS
    SO -.->|security.threat.detected| REDIS
    SRO -.->|operations.alert.raised| REDIS
    PO -.->|pipeline.batch.processed| REDIS

    %% Security Monitoring
    SO -.-> CO
    SO -.-> IO
    SO -.-> AGM
    SO -.-> PO

    %% Operations Monitoring
    SRO -.-> CO
    SRO -.-> IO
    SRO -.-> AGM
    SRO -.-> PO

    classDef swarmLead fill:#f96,stroke:#333,stroke-width:4px
    classDef agent fill:#bbf,stroke:#333,stroke-width:2px
    classDef external fill:#fdb,stroke:#333,stroke-width:2px
    classDef data fill:#dfd,stroke:#333,stroke-width:2px
    classDef provider fill:#ffd,stroke:#333,stroke-width:2px

    class MC,CO,IO,AGM,SO,SRO,PO swarmLead
    class PHM,DV,RM,BO,MSC,DPA,CA,CIA,TCE,COA,RF,UAA,SLA,AV,AD,AL,KLM,HM,PA,COP,CP,BM,WC,RO agent
    class UI,API,CRON external
    class DB,REDIS,DT,DRT,VST,PAK data
    class OAI,ANT,DS,MIS,XAI,TOG,PER,GOO,COH,A21,GRO provider
```

## Data Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant CRON as Weekly Scheduler
    participant MC as Master Coordinator
    participant CS as Collection Swarm
    participant LLM as LLM Providers
    participant DB as PostgreSQL
    participant IS as Intelligence Swarm
    participant REDIS as Redis PubSub
    participant AS as API Swarm
    participant UI as Frontend/API

    CRON->>MC: Trigger weekly cycle
    MC->>CS: Start collection
    
    loop For each domain batch
        CS->>DB: Fetch pending domains
        CS->>LLM: Call APIs (parallel)
        LLM-->>CS: Responses
        CS->>DB: Store responses
        CS->>REDIS: Publish progress
    end
    
    CS->>REDIS: data.collection.complete
    REDIS->>IS: Notify completion
    
    IS->>DB: Fetch raw responses
    IS->>IS: Compute tensors
    IS->>IS: Analyze patterns
    IS->>DB: Store insights
    IS->>REDIS: intelligence.insight.generated
    
    REDIS->>AS: Notify new data
    AS->>AS: Update caches
    
    UI->>AS: Request data
    AS->>AS: Check auth & cache
    AS->>DB: Fetch if needed
    AS-->>UI: Return intelligence
```

## Swarm Topology Diagrams

### Collection Swarm (Hierarchical)
```mermaid
graph TD
    CO[Collection Orchestrator<br/>LEAD]
    CO --> PHM[Provider Health Monitor]
    CO --> DV[Data Validator]
    CO --> RM[Retry Manager]
    CO --> BO[Batch Optimizer]
    
    PHM --> W1[Worker Pool 1]
    PHM --> W2[Worker Pool 2]
    DV --> W3[Worker Pool 3]
    RM --> W4[Worker Pool 4]
    BO --> W5[Worker Pool 5]
```

### Intelligence Swarm (Mesh)
```mermaid
graph LR
    IO[Intelligence Orchestrator]
    MSC[Memory Calculator]
    DPA[Drift Analyzer]
    CA[Consensus Analyzer]
    CIA[Competitive Intel]
    TCE[Tensor Engine]
    
    IO <--> MSC
    IO <--> DPA
    IO <--> CA
    IO <--> CIA
    MSC <--> TCE
    DPA <--> TCE
    CA <--> TCE
    CIA <--> TCE
    MSC <--> DPA
    DPA <--> CA
    CA <--> CIA
```

### API Swarm (Star)
```mermaid
graph TD
    AGM[API Gateway Manager<br/>CENTRAL]
    AGM --> COA[Cache Optimizer]
    AGM --> RF[Response Formatter]
    AGM --> UAA[Usage Analytics]
    AGM --> SLA[SLA Monitor]
```

### Security Swarm (Ring)
```mermaid
graph LR
    SO[Security Orchestrator]
    AV[Access Validator]
    AD[Anomaly Detector]
    AL[Audit Logger]
    KLM[Key Manager]
    
    SO --> AV
    AV --> AD
    AD --> AL
    AL --> KLM
    KLM --> SO
```

## Tensor Computation Structure

```mermaid
graph TB
    subgraph "MemoryTensor"
        MT[Brand × LLM × Score × Time]
    end
    
    subgraph "SentimentTensor"
        ST[Brand × Source × Sentiment × Time]
    end
    
    subgraph "GroundingTensor"
        GT[Brand × Category × Signal × Time]
    end
    
    subgraph "Derived Insights"
        DI1[Memory Decay Curves]
        DI2[Sentiment Drift Patterns]
        DI3[Consensus Scores]
        DI4[Competitive Position]
    end
    
    MT --> DI1
    ST --> DI2
    MT --> DI3
    ST --> DI3
    GT --> DI3
    MT --> DI4
    ST --> DI4
    GT --> DI4
```

## State Machine Diagrams

### Domain Processing State Machine
```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Processing: Collection Started
    Processing --> Validating: Responses Received
    Validating --> Failed: Validation Error
    Validating --> Analyzed: Validation Passed
    Failed --> Processing: Retry
    Analyzed --> Completed: Insights Generated
    Completed --> [*]
```

### Swarm Lifecycle State Machine
```mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> Ready: Health Check Passed
    Ready --> Active: Task Assigned
    Active --> Processing: Executing
    Processing --> Active: Task Complete
    Active --> Paused: Pause Command
    Paused --> Active: Resume Command
    Active --> Failed: Critical Error
    Failed --> Recovering: Auto Recovery
    Recovering --> Ready: Recovery Success
    Ready --> Terminated: Shutdown Command
    Terminated --> [*]
```

## Resource Allocation Diagram

```mermaid
pie title "Compute Resource Allocation"
    "Collection Swarm" : 30
    "Intelligence Swarm" : 25
    "API Swarm" : 20
    "Pipeline Swarm" : 15
    "Security Swarm" : 5
    "Operations Swarm" : 5
```

## Performance Metrics Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN RUNNER SWARM DASHBOARD             │
├─────────────────────┬───────────────────┬───────────────────┤
│ Collection Status   │ Intelligence Status│ API Performance   │
│ ┌─────────────────┐ │ ┌─────────────────┐│ ┌─────────────────┐│
│ │Domains: 3239/3239│ │ │Tensors: Updated ││ │Requests: 1.2M/d ││
│ │Progress: 100%    │ │ │Insights: 847    ││ │Latency: 87ms    ││
│ │Speed: 1247/hr   │ │ │Alerts: 12       ││ │Cache Hit: 94.2% ││
│ └─────────────────┘ │ └─────────────────┘│ └─────────────────┘│
├─────────────────────┴───────────────────┴───────────────────┤
│                        Swarm Health                          │
│ Collection: ●  Intelligence: ●  API: ●  Security: ●         │
│ Operations: ●  Pipeline: ●                                   │
├─────────────────────────────────────────────────────────────┤
│                    Active Alerts                             │
│ ⚠️  High memory usage in Collection Swarm (87%)              │
│ ⚠️  Drift detected: Tesla brand perception shift             │
│ ✅ All systems operational                                   │
└─────────────────────────────────────────────────────────────┘

Legend: ● Healthy  ● Warning  ● Critical
```

## Cost Analysis by Swarm

```mermaid
graph LR
    subgraph "Monthly Costs"
        CS[Collection<br/>$2,400]
        IS[Intelligence<br/>$800]
        AS[API<br/>$600]
        SS[Security<br/>$200]
        OS[Operations<br/>$400]
        PS[Pipeline<br/>$1,200]
    end
    
    subgraph "Cost Breakdown"
        LLM[LLM APIs<br/>$3,200]
        INFRA[Infrastructure<br/>$1,600]
        MON[Monitoring<br/>$800]
    end
    
    CS --> LLM
    IS --> INFRA
    AS --> INFRA
    PS --> INFRA
    OS --> MON
```

## Scale Progression

```
Week 1:  [■□□□□□□□□□] 10%  - Single swarm operational
Week 2:  [■■■□□□□□□□] 30%  - Collection + Intelligence
Week 3:  [■■■■■□□□□□] 50%  - Add API + Security
Week 4:  [■■■■■■■□□□] 70%  - Add Operations + Pipeline
Week 5:  [■■■■■■■■■□] 90%  - Inter-swarm coordination
Week 6:  [■■■■■■■■■■] 100% - Full system operational

Target Metrics:
- 10,000 domains/week capacity
- 50+ LLM models
- <50ms API response
- 99.99% uptime
```

This comprehensive diagram specification provides visual representation of:
1. Overall system architecture
2. Data flow sequences
3. Individual swarm topologies
4. State machines for key processes
5. Resource allocation
6. Performance dashboards
7. Cost analysis
8. Scaling progression

Each diagram can be rendered using Mermaid in documentation tools or converted to high-quality images for presentations.
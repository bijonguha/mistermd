// Example content templates
const examples = {
    flowchart: 
`# Flowchart Example

Below is a simple flowchart showing a decision process:

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is it raining?}
    B -->|Yes| C[Bring an umbrella]
    B -->|No| D[Enjoy the sunshine]
    C --> E[End]
    D --> E
    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style B fill:#fff3e0
\`\`\`

The flowchart demonstrates how to represent decision points and different paths in a process.`,

    sequence: 
`# Sequence Diagram Example

Below is a sequence diagram showing the interaction between different components:

\`\`\`mermaid
sequenceDiagram
    participant User
    participant System
    participant Database
    
    User->>System: Login Request
    System->>Database: Validate Credentials
    Database-->>System: Authentication Result
    alt is valid
        System-->>User: Access Granted
    else is invalid
        System-->>User: Access Denied
    end
\`\`\`

Sequence diagrams are great for visualizing the interaction between different components over time.`,

    gantt: 
`# Gantt Chart Example

The Gantt chart below shows a project schedule:

\`\`\`mermaid
gantt
    title Project Schedule
    dateFormat  YYYY-MM-DD
    section Planning
    Requirement Analysis   :a1, 2025-05-01, 7d
    System Design          :a2, after a1, 10d
    section Development
    Implementation         :a3, after a2, 15d
    Testing                :a4, after a3, 7d
    section Deployment
    Training               :a5, after a4, 5d
    Go Live                :milestone, after a5, 0d
\`\`\`

Gantt charts help visualize project timelines and dependencies between tasks.`,

    code: 
`# Code Example

Here's a JavaScript function that processes data:

\`\`\`javascript
function processData(data) {
    return data.map(item => {
        return {
            id: item.id,
            value: item.value * 2,
            timestamp: new Date().toISOString()
        };
    });
}

// Usage example
const result = processData([
    { id: 1, value: 10 },
    { id: 2, value: 20 }
]);
console.log(result);
\`\`\`

This function takes an array of objects, doubles the value property, and adds a timestamp.`,

    complete: 
`# Project Documentation

## Introduction
This is an example of combining **Markdown** with *Mermaid* diagrams. Markdown is a lightweight markup language that you can use to add formatting elements to plaintext text documents.

## System Architecture
Below is our system architecture:

\`\`\`mermaid
flowchart LR
    User[👤 User] --> Frontend[🖥️ Frontend]
    Frontend --> API[🔗 API Gateway]
    API --> ServiceA[⚙️ Service A]
    API --> ServiceB[⚙️ Service B]
    ServiceA --> DB[(🗄️ Database)]
    ServiceB --> DB
    style User fill:#e3f2fd
    style Frontend fill:#f3e5f5
    style API fill:#e8f5e8
    style ServiceA fill:#fff3e0
    style ServiceB fill:#fff3e0
    style DB fill:#fce4ec
\`\`\`

## Features
1. **Easy to use interface** - Intuitive design for all users
2. **Real-time updates** - Live preview as you type
3. **Data visualization** - Beautiful charts and diagrams

> **Note:** This is just a demonstration of what's possible with markdown and Mermaid diagrams.

## Component Interaction
The sequence of operations:

\`\`\`mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as 🖥️ Frontend
    participant B as ⚙️ Backend
    
    U->>F: User Action
    F->>B: API Request
    B->>B: Process Data
    B-->>F: Response
    F-->>U: Update UI
\`\`\`

## Project Timeline

\`\`\`mermaid
gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Planning    :a1, 2025-05-01, 15d
    Development :a2, after a1, 30d
    section Phase 2
    Testing     :a3, after a2, 20d
    Deployment  :a4, after a3, 10d
\`\`\`

## Code Example
\`\`\`javascript
function processData(data) {
    return data.map(item => {
        return {
            id: item.id,
            value: item.value * 2,
            timestamp: new Date().toISOString()
        };
    });
}

// Usage example
const result = processData([
    { id: 1, value: 10 },
    { id: 2, value: 20 }
]);
console.log(result);
\`\`\`

## Feature Comparison

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| 🔐 Login | ✅ Done | High | Needs security review |
| 📊 Dashboard | 🔄 In Progress | High | 60% complete |
| 📈 Reports | 📋 Planned | Medium | Starting next week |
| 🔔 Notifications | ❌ Not Started | Low | Future enhancement |

## Conclusion

This enhanced viewer provides:
- **High-quality rendering** with professional styling
- **Better export quality** for PNG and PDF formats
- **Responsive design** that works on all devices
- **Enhanced typography** for better readability
`
};

// Function to load example content
function loadExample(type) {
    const markdownInput = document.getElementById('markdown-input');
    markdownInput.value = examples[type];
    renderMarkdown();
}
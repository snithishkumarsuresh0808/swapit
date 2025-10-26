# SwapIt Project Flowchart

This flowchart illustrates the high-level user flow for the SwapIt skill-swapping platform.

```mermaid
graph TD
    A[User visits SwapIt website] --> B{User logged in?}
    B -->|No| C[Signup Page]
    C --> D[Create Account]
    D --> E[Login Page]
    E --> F[Authenticate User]
    F --> G[Dashboard]
    B -->|Yes| G
    G --> H[View Posts Feed]
    H --> I[Create New Post]
    I --> J[Post Skills & Wanted Skills]
    J --> H
    H --> K[View Post Details]
    K --> L[Message User]
    L --> M[Chat Interface]
    M --> N[Send/Receive Messages]
    G --> O[Profile Page]
    O --> P[View/Edit Profile]
    P --> Q[Settings]
    Q --> R[Update Preferences]
    G --> S[Matches Page]
    S --> T[View Potential Matches]
    T --> U[Connect with Users]
    U --> L
    G --> V[Calendar Page]
    V --> W[View Availability]
    W --> X[Schedule Sessions]

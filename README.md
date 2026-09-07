# ThreatLens

ThreatLens is an AI-powered cybersecurity investigation agent focused on Identity and Access Management (IAM) and authentication logs. The system will use security log data collected through Splunk to help cybersecurity analysts detect, investigate, and understand suspicious login activity. ThreatLens will focus on events such as repeated failed login attempts, successful logins after consecutive failures, unusual login times, and logins from unfamiliar IP addresses. The goal of the project is to reduce the amount of time analysts spend manually searching and correlating authentication logs while providing useful context for security investigations.

## Team Members

- Cristian Costilla
- Angel Becerra

## Contact

- Cristian Costilla — ccostill@stedwards.edu
- Angel Becerra — abecerr8@stedwards.edu

## Project Documentation

- [Problem Description] https://docs.google.com/document/d/1UVjasLkeq7Oyetyy4GqGlC6ng8ulBKu9T1lKgaFFNKY/edit?usp=sharing

## Branching Model

Our team will use a feature-branch workflow. The `main` branch will contain the stable and deployable version of the project. Non-trivial development work will be completed on separate feature or bug-fix branches and merged into `main` through pull requests after review by the other team member.

Branch naming conventions:

- `feature/<issue-number>-<short-description>` — new features
- `fix/<short-description>` — bug fixes

Examples:

- `feature/2-splunk-integration`
- `feature/3-authentication-log-parser`
- `feature/4-ai-investigation`
- `fix/login-filter-error`

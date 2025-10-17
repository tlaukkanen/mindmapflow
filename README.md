# MindMapFlow

Meet MindMapFlow, your ultimate brainstorming companion. Designed to unleash creativity and enhance productivity, MindMapFlow transforms complex ideas into clear, structured visuals. Whether you're a student, professional, or creative, our intuitive interface helps you map out thoughts, simplify concepts, and bring your projects to life. Join the MindMapFlow revolution and unlock the full potential of your mind!

![Screenshot](/public/screens/mindmapflow_20251016.png)

![EU Cyber Resilience Act](/public/screens/eu_cyber_resilience_act_cra.png)

### AI suggestions using Azure OpenAI services
![AI suggestions](/public/screens/ai-suggestions-2025-10-16.png)

### Multiple pre-defined themes
![Themes](/public/screens/themes-2025-10-16.png)

# Tech Stack

MindMapFlow is built using these major components:

* React, Next.js - https://nextjs.org/
* MUI React UI tools - https://mui.com/
* React Flow - https://reactflow.dev/
* Azure OpenAI in Foundry Models - https://azure.microsoft.com/en-us/products/ai-foundry/models/openai

## Configuration

Following environment variables are used as configuration:

- `DATABASE_URL` - SQL Server connection string
- `NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING` - AppInsights
- `ENV` - prod or local
- `AZURE_STORAGE_CONNECTION_STRING` - for storing mindmaps
- `ALLOWED_USERS` - comma separated list of allowed user email addresses
- `GOOGLE_CLIENT_ID` - Client ID from Google Platform to allow "login with Google"
- `GOOGLE_SECRET` - Client secret for Google account login
- `NEXTAUTH_SECRET`

Set the following environment variables to enable AI-powered suggestions via Azure OpenAI:

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_MODEL`
- `AZURE_OPENAI_API_VERSION`

## 3rd Party Notes

- https://screely.com/ used for browser mockup screenshots
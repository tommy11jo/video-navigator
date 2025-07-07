# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Video Navigator is a full-stack application that helps users navigate and understand video content through AI-generated overviews. The application provides interactive video viewing with synchronized chapter navigation, AI-powered Q&A, and shareable video overviews.

**Architecture**: Split into separate frontend and backend services

- **Frontend**: React/TypeScript SPA with Vite, deployed on Vercel
- **Backend**: FastAPI Python service with Poetry, deployed via Docker

## Common Commands

### Frontend Development

```bash
cd frontend
npm run dev          # Start development server
```

### Backend Development

```bash
cd backend
poetry install       # Install dependencies
poetry run uvicorn app.main:app --reload --port 8080  # Start development server
```

### Production Deployment

```bash
# Backend (Docker)
cd backend
docker compose build --no-cache
docker compose --profile production up

# Frontend (Vercel)
vercel --prod
```

## Architecture

### Frontend Structure

- **React Router**: Single-page application with `/`, `/video/:videoId`, and `/about` routes
- **State Management**: Context API via `UserContext` for user API keys and settings
- **Video Integration**: Plyr.js for video player with YouTube embed support
- **Styling**: Tailwind CSS with custom scrollbar styles

### Backend Structure

- **FastAPI**: Modern async Python web framework
- **Route Organization**: Single module `video_overview` handles all video-related endpoints
- **Database**: Supabase for storing video overviews and usage metrics
- **AI Integration**: Multiple AI providers (Anthropic Claude, OpenAI, Fireworks) with rate limiting

### Key Backend Endpoints

- `POST /generate-overview/{video_id}` - Generate AI overview for a video
- `GET /get-overview/{video_id}` - Retrieve cached video overview
- `GET /get-transcript/{video_id}` - Get video transcript with timestamps
- `POST /chat/{video_id}` - Q&A chat about video content

### Data Flow

1. User provides YouTube video URL
2. Backend fetches transcript via youtube-transcript-api
3. AI generates structured overview with chapters and key points
4. Frontend displays split-view: video player + interactive overview
5. User can click chapter titles/key points to jump to timestamps

### Video Overview Generation

- Uses Anthropic Claude with function calling for structured output
- Generates 5-30 chapters depending on video length
- Each chapter includes: title, key points with timestamps, associations
- Implements rate limiting and API key management (user keys + fallback service keys)

### Rate Limiting & API Keys

- Users can provide their own Anthropic API keys
- Service falls back to shared keys with rate limiting
- Tracks usage per IP address and implements daily limits
- Supports multiple AI providers as fallbacks

## Development Notes

### YouTube Transcript Workaround

The python `youtube-transcript-api` works locally but not in cloud environments due to IP blocking. The production backend uses proxies as a workaround.

### Frontend Configuration

- Uses Vite for fast development and building
- TypeScript strict mode enabled
- ESLint configured for React hooks and TypeScript

### Backend Configuration

- FastAPI with CORS middleware for cross-origin requests
- Pydantic for request/response validation
- Structured logging throughout the application
- Environment-based configuration via `config.py`

### Database Schema

- `video_overviews` table stores generated overviews keyed by video_id
- Usage tracking tables for rate limiting and analytics

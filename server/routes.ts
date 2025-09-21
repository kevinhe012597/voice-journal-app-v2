import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { OpenAIService } from "./services/openaiService";
import { GitHubService } from "./services/githubService";
import fs from 'fs';
import path from 'path';

export async function registerRoutes(app: Express): Promise<Server> {
  // Speech-to-text journaling API routes
  
  // OpenAI text synthesis route
  app.post('/api/synthesize', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text content is required' });
      }

      const synthesized = await OpenAIService.synthesizeKeyEventsWithDates(text);
      res.json(synthesized);
    } catch (error) {
      console.error('Synthesis error:', error);
      
      // Fallback to basic processing if OpenAI fails
      try {
        const fallback = OpenAIService.fallbackMultiDateSynthesis(req.body.text);
        res.json({
          ...fallback,
          fallback: true,
          error: 'OpenAI unavailable, used basic processing'
        });
      } catch (fallbackError) {
        res.status(500).json({ error: 'Text synthesis failed' });
      }
    }
  });

  // GitHub integration routes
  app.post('/api/github/save-project', async (req, res) => {
    try {
      const { repositoryName, description, isPrivate } = req.body;
      
      if (!repositoryName) {
        return res.status(400).json({ error: 'Repository name is required' });
      }

      // Get authenticated user
      const user = await GitHubService.getAuthenticatedUser();
      
      // Create repository
      const repo = await GitHubService.createRepository(
        repositoryName,
        description || 'Speech-to-Text Journaling App built with React, OpenAI, and Web Speech API',
        isPrivate || false
      );

      // Collect all project files
      const projectFiles: Array<{ path: string; content: string }> = [];
      
      // Helper function to read files recursively
      const readDirRecursive = (dirPath: string, basePath: string = '') => {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.join(basePath, entry.name);
          
          // Skip certain directories and files
          if (entry.name.startsWith('.') || 
              entry.name === 'node_modules' || 
              entry.name === 'dist' ||
              entry.name === 'build' ||
              entry.name.includes('log')) {
            continue;
          }
          
          if (entry.isDirectory()) {
            readDirRecursive(fullPath, relativePath);
          } else if (entry.isFile()) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              projectFiles.push({
                path: relativePath.replace(/\\/g, '/'), // Normalize path separators
                content: content
              });
            } catch (error) {
              console.warn(`Failed to read file ${fullPath}:`, error);
            }
          }
        }
      };

      // Read project files
      readDirRecursive('.');

      // Add a README.md file
      const readmeContent = `# Speech-to-Text Journaling App

An AI-powered journaling application that converts your speech into organized bullet points using OpenAI's advanced language model.

## Features

- **Voice Recording**: Hold-to-talk or click-to-toggle recording interface
- **AI Synthesis**: Uses OpenAI GPT-5 to extract key events from speech instead of verbatim transcription
- **Smart Organization**: Automatically organizes entries by date
- **Local Storage**: All entries saved locally in your browser
- **Keyboard Shortcuts**: Spacebar to start/stop recording
- **AssemblyAI Ready**: Enhanced transcription option with clear upgrade path

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **AI Integration**: OpenAI GPT-5 for intelligent summarization
- **Speech Recognition**: Web Speech API with AssemblyAI integration ready
- **Storage**: localStorage with optional database upgrade path

## Getting Started

1. Clone this repository
2. Install dependencies: \`npm install\`
3. Set up environment variables:
   - \`OPENAI_API_KEY\`: Your OpenAI API key
   - \`ASSEMBLYAI_API_KEY\`: (Optional) For enhanced speech recognition
4. Start the development server: \`npm run dev\`
5. Open your browser to the provided URL

## How It Works

1. **Speak Naturally**: Record your thoughts, activities, and events
2. **AI Processing**: OpenAI analyzes your speech and extracts key events
3. **Smart Formatting**: Creates concise 3-15 word bullet points
4. **Auto Organization**: Groups entries under date headers
5. **Local Persistence**: Everything saves automatically to your browser

## Example

**Your Speech**: "I woke up early this morning and went to the gym, then I had a meeting with my team about the new project, and after that I grabbed lunch with Sarah and discussed the upcoming presentation"

**AI Output**:
- Early gym workout
- Team meeting about new project  
- Lunch with Sarah about presentation

Built with ❤️ on Replit
`;

      projectFiles.push({
        path: 'README.md',
        content: readmeContent
      });

      // Upload files to GitHub
      await GitHubService.uploadFiles(
        user.login,
        repo.name,
        projectFiles,
        'Initial commit: Speech-to-Text Journaling App with OpenAI integration'
      );

      res.json({
        success: true,
        repository: repo,
        filesUploaded: projectFiles.length,
        user: user.login
      });

    } catch (error: any) {
      console.error('GitHub save error:', error);
      res.status(500).json({ 
        error: 'Failed to save project to GitHub: ' + error.message 
      });
    }
  });

  app.get('/api/github/user', async (req, res) => {
    try {
      const user = await GitHubService.getAuthenticatedUser();
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get GitHub user: ' + error.message });
    }
  });
  
  // TODO: Add AssemblyAI integration
  // Route to get AssemblyAI auth token (for frontend to use directly)
  app.get('/api/assemblyai/token', async (req, res) => {
    try {
      // TODO: Replace with actual AssemblyAI API key from environment
      const apiKey = process.env.ASSEMBLYAI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          error: 'AssemblyAI API key not configured. Please set ASSEMBLYAI_API_KEY environment variable.' 
        });
      }

      // For security, we don't send the full API key to frontend
      // Instead, we could create a temporary token or proxy the requests
      res.json({ message: 'AssemblyAI integration ready', hasApiKey: true });
    } catch (error) {
      console.error('AssemblyAI token error:', error);
      res.status(500).json({ error: 'Failed to get AssemblyAI token' });
    }
  });

  // TODO: Add AssemblyAI transcription proxy route
  // Route to proxy transcription requests to AssemblyAI
  app.post('/api/assemblyai/transcribe', async (req, res) => {
    try {
      const apiKey = process.env.ASSEMBLYAI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          error: 'AssemblyAI API key not configured' 
        });
      }

      const { audio_url } = req.body;
      
      if (!audio_url) {
        return res.status(400).json({ error: 'audio_url is required' });
      }

      // TODO: Implement actual AssemblyAI API call
      // const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      //   method: 'POST',
      //   headers: {
      //     'authorization': apiKey,
      //     'content-type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     audio_url,
      //     speaker_labels: false,
      //     auto_punctuation: true,
      //     auto_capitalization: true
      //   })
      // });
      
      // For now, return a placeholder response
      res.json({ 
        message: 'AssemblyAI transcription endpoint ready',
        status: 'TODO - implement actual AssemblyAI integration'
      });
    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      res.status(500).json({ error: 'Failed to transcribe audio' });
    }
  });

  // TODO: Add AssemblyAI polling route for checking transcription status
  app.get('/api/assemblyai/transcript/:id', async (req, res) => {
    try {
      const apiKey = process.env.ASSEMBLYAI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'AssemblyAI API key not configured' });
      }

      const { id } = req.params;
      
      // TODO: Implement actual AssemblyAI polling
      // const response = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      //   headers: {
      //     'authorization': apiKey
      //   }
      // });
      
      res.json({ 
        message: 'AssemblyAI polling endpoint ready',
        transcriptId: id,
        status: 'TODO - implement actual AssemblyAI polling'
      });
    } catch (error) {
      console.error('AssemblyAI polling error:', error);
      res.status(500).json({ error: 'Failed to get transcript status' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

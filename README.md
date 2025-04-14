# GitHub Repository Analyzer

A React-based web application that analyzes GitHub repositories and provides insights about commits, contributors, and other metrics.

## Features

- Repository metadata (stars, forks, issues)
- Top contributors list
- Weekly commit activity visualization
- Rate limit handling with informative messages
- Dark mode UI

## Prerequisites

- Node.js (v16 or higher)
- npm
- Docker (optional, for containerized deployment)

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd github-repo-analyzer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```bash
   REACT_APP_GITHUB_TOKEN=your_github_token_here
   ```
   Get your GitHub token from: GitHub Settings → Developer Settings → Personal Access Tokens

4. Run the development server:
   ```bash
   npm start
   ```
   The app will be available at http://localhost:3000

## Docker Deployment

1. Build the Docker image:
   ```bash
   docker build --build-arg REACT_APP_GITHUB_TOKEN=your_github_token_here -t github-repo-analyzer .
   ```

2. Run the container:
   ```bash
   docker run -d -p 8080:80 github-repo-analyzer
   ```
   The app will be available at http://localhost:8080

## Usage

1. Enter a GitHub repository URL (e.g., https://github.com/facebook/react)
2. Click "Analyze" to fetch repository data
3. View the repository insights in the dashboard

## Technologies Used

- React
- Material-UI
- Chart.js
- GitHub REST API
- Docker
- Nginx

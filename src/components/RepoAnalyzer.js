import React, { useState } from 'react';
import axios from 'axios';
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const RepoAnalyzer = () => {
  const [url, setUrl] = useState('');
  const [repoData, setRepoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commitData, setCommitData] = useState(null);

  const getHeaders = () => {
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (process.env.REACT_APP_GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.REACT_APP_GITHUB_TOKEN}`;
    }
    
    return headers;
  };

  const extractRepoInfo = (url) => {
    try {
      const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
      const matches = url.match(regex);
      if (matches && matches.length === 3) {
        return { owner: matches[1], repo: matches[2] };
      }
      throw new Error('Invalid GitHub repository URL');
    } catch (err) {
      throw new Error('Invalid GitHub repository URL');
    }
  };

  const fetchCommitActivity = async (owner, repo, retries = 5) => {
    try {
      console.log(`Fetching commit activity for ${owner}/${repo}, attempt ${6 - retries}/5`);
      
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`,
        {
          headers: getHeaders()
        }
      );

      console.log('Response status:', response.status);
      console.log('Response data type:', typeof response.data);
      console.log('Response data length:', Array.isArray(response.data) ? response.data.length : 'not an array');

      // Check if we got a 202 status (data being computed)
      if (response.status === 202 && retries > 0) {
        console.log('GitHub is computing statistics, retrying in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return fetchCommitActivity(owner, repo, retries - 1);
      }

      // Handle empty repositories or repositories with no commits
      if (response.data === null || (Array.isArray(response.data) && response.data.length === 0)) {
        if (retries > 0) {
          console.log('No commit data received yet, retrying...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          return fetchCommitActivity(owner, repo, retries - 1);
        }
        return Array(52).fill({ total: 0 }); // Return empty data for visualization
      }

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
      
      // If we reach here, we couldn't get valid data
      if (retries > 0) {
        console.log('Invalid data format received, retrying...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return fetchCommitActivity(owner, repo, retries - 1);
      }

      console.error('Final attempt failed. Response data:', response.data);
      throw new Error('Repository commit data is not available');
    } catch (err) {
      console.error('Commit activity error details:', {
        status: err.response?.status,
        headers: err.response?.headers,
        data: err.response?.data,
        message: err.message
      });

      if (err.response) {
        if (err.response.status === 403) {
          const resetTime = err.response.headers['x-ratelimit-reset'];
          const resetDate = resetTime ? new Date(resetTime * 1000).toLocaleString() : 'unknown time';
          throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}`);
        } else if (err.response.status === 404) {
          throw new Error('Repository not found or private.');
        } else if (err.response.status === 409) {
          throw new Error('Repository is empty or has no commit history.');
        }
      }
      throw new Error(`Failed to fetch commit activity: ${err.message}`);
    }
  };

  const fetchRepoData = async () => {
    setLoading(true);
    setError('');
    setRepoData(null);
    setCommitData(null);

    try {
      const { owner, repo } = extractRepoInfo(url);
      
      // First fetch basic repo data to verify the repo exists
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: getHeaders()
        }
      );

      let commitActivity;
      try {
        commitActivity = await fetchCommitActivity(owner, repo);
      } catch (commitErr) {
        console.error('Commit activity error:', commitErr);
        setError(`Note: ${commitErr.message}`);
        commitActivity = null;
      }

      const contributorsResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`,
        {
          headers: getHeaders()
        }
      );

      setRepoData({
        ...repoResponse.data,
        contributors: contributorsResponse.data,
      });

      if (commitActivity) {
        const labels = commitActivity.map((week, index) => `Week ${index + 1}`);
        const commits = commitActivity.map((week) => week.total);

        setCommitData({
          labels,
          datasets: [
            {
              label: 'Commits per Week',
              data: commits,
              borderColor: '#2196f3',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
            },
          ],
        });
      }
    } catch (err) {
      console.error('Repo data error details:', err.response || err);
      if (err.response) {
        if (err.response.status === 403) {
          const resetTime = err.response.headers['x-ratelimit-reset'];
          const resetDate = resetTime ? new Date(resetTime * 1000).toLocaleString() : 'unknown time';
          setError(`GitHub API rate limit exceeded. Resets at ${resetDate}`);
        } else if (err.response.status === 404) {
          setError('Repository not found or private.');
        }
      }
      setError(err.message || 'Failed to fetch repository data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        GitHub Repository Analyzer
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={9}>
                  <TextField
                    fullWidth
                    label="GitHub Repository URL"
                    variant="outlined"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={fetchRepoData}
                    disabled={loading || !url}
                    sx={{ height: '56px' }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Analyze'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        {repoData && (
          <>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Repository Information
                  </Typography>
                  <Typography>Name: {repoData.name}</Typography>
                  <Typography>Stars: {repoData.stargazers_count}</Typography>
                  <Typography>Forks: {repoData.forks_count}</Typography>
                  <Typography>Open Issues: {repoData.open_issues_count}</Typography>
                  <Typography>Language: {repoData.language}</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Contributors
                  </Typography>
                  {repoData.contributors.map((contributor) => (
                    <Typography key={contributor.id}>
                      {contributor.login} ({contributor.contributions} commits)
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            {commitData && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Commit Activity (Last 52 Weeks)
                    </Typography>
                    <Box sx={{ height: '400px' }}>
                      <Line
                        data={commitData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </>
        )}
      </Grid>
    </Box>
  );
};

export default RepoAnalyzer;

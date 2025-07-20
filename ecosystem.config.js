module.exports = {
  apps: [
    {
      name: 'interview-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      }
    },
    {
      name: 'interview-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',  // Changed from 'run dev' to 'start'
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};

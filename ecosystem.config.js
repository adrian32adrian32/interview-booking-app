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
      script: './node_modules/.bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

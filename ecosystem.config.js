module.exports = {
  apps: [
    {
      name: 'interview-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'interview-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};

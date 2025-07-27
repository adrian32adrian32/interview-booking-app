module.exports = {
  apps: [
    {
      name: 'interview-backend',
      cwd: './backend',
      script: './dist/server.js',
      interpreter: 'node',
      interpreter_args: '-r dotenv/config',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
    },
    {
      name: 'interview-frontend', 
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
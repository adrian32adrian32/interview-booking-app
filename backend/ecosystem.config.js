module.exports = {
  apps: [
    {
      name: 'interview-backend',
      script: './node_modules/.bin/ts-node',
      args: 'src/server.ts',
      cwd: '/home/apps/interview-booking-app/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'interview-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/home/apps/interview-booking-app/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false
    }
  ]
};

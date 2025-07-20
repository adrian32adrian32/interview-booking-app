module.exports = {
  apps: [{
    name: 'interview-frontend',
    script: './node_modules/next/dist/bin/next',
    args: 'start -p 3001',
    cwd: '/home/apps/interview-booking-app/frontend',
    env: {
      NODE_ENV: 'production'
    }
  }]
}

module.exports = {
  apps: [{
    name: 'interview-app-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/apps/interview-booking-app/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

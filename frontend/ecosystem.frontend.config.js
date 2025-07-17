module.exports = {
  apps: [{
    name: 'interview-app-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/home/apps/interview-booking-app/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
};

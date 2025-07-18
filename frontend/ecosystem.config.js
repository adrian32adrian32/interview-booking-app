module.exports = {
  apps: [{
    name: 'interview-frontend',
    script: 'npm',
    args: 'start',
    env: {
      PORT: 3001,
      NODE_ENV: 'production'
    }
  }]
}

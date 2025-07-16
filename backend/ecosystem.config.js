module.exports = {
  apps: [{
    name: 'interview-app-backend',
    script: './server.js',
    instances: 1,  // Schimbat de la 2 la 1 pentru început
    exec_mode: 'fork',  // Schimbat de la cluster la fork
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

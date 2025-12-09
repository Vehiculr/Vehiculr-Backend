// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'vehiculr-backend',
      script: 'server.js',
      instances: 'max',         // set to 'max' for cluster mode or a number
      exec_mode: 'cluster',     // use cluster mode
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 9002,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 9002,
      }
    }
  ]
};

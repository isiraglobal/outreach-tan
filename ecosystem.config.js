module.exports = {
  apps: [{
    name: 'outreach-backend',
    script: './backend/index.js',
    watch: false,
    restart_delay: 3000,
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};

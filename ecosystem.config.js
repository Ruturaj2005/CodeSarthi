// PM2 Ecosystem Config — used by the Hostinger VPS
// Start:   pm2 start ecosystem.config.js
// Reload:  pm2 reload codesarthi
// Save:    pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: "codesarthi",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/codesarthi",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      // The remaining secrets are loaded from .env.local on the server
      env_file: "/var/www/codesarthi/.env.local",
      error_file: "/var/log/pm2/codesarthi-error.log",
      out_file: "/var/log/pm2/codesarthi-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};

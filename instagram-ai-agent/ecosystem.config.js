module.exports = {
  apps: [{
    name: 'instagram-ai-agent',
    script: 'scheduler.js',
    args: '--post-now',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '5s',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    // Log configuration
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true,
    // Restart on memory threshold
    max_memory_restart: '1G',
    // Restart on file changes (optional)
    watch: ['index.js', 'scheduler.js', '.env'],
    ignore_watch: ['node_modules', 'logs', 'images'],
  }]
}; 
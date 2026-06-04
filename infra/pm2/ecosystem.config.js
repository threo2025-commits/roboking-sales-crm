module.exports = {
  apps: [
    {
      name: 'roboking-crm-backend',
      cwd: '/home/ubuntu/roboking-sales-crm/backend',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/log/roboking-crm/backend-error.log',
      out_file: '/var/log/roboking-crm/backend-out.log',
      time: true
    }
  ]
};

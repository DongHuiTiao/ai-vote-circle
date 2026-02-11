module.exports = {
  apps: [
    {
      name: 'voteverse-worker',
      script: './src/lib/auto-vote-worker.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env',
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 传递实例 ID 环境变量
      instance_var: 'NODE_APP_INSTANCE',
    },
  ],
};

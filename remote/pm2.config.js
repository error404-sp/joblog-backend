module.exports = {
  apps: [
    {
      name: "remote-job-agent",
      script: "index.js",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000, // wait 5s before retry
      env: {
        NODE_ENV: "production",
        BACKEND_URL: process.env.BACKEND_URL,
      },
    },
  ],
};

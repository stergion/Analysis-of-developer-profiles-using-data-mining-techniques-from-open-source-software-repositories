module.exports = {
  apps: [{
    name: "diploma-thesis-stergios-nanos-backend",
    script: "./dist/app.js",
    instances: "4",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "dev",
    },
    env_production: {
      NODE_ENV: "production",
    },
  }],
};

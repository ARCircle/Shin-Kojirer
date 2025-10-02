#!/usr/bin/env node

const { spawn } = require('child_process');

// Launch backend and frontend dev servers in parallel.
const workspaces = ['backend', 'frontend'];
const children = [];
let exitCode;

const shutdown = (signal) => {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
};

workspaces.forEach((workspace) => {
  const child = spawn('npm', ['run', 'dev', '--workspace', workspace], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      WORKSPACE_NAME: workspace,
    },
  });

  child.on('exit', (code) => {
    if (exitCode === undefined && code !== 0) {
      exitCode = code ?? 1;
    }
    shutdown('SIGINT');
  });

  children.push(child);
});

const handleTermination = (signal) => {
  shutdown(signal);
};

process.on('SIGINT', handleTermination);
process.on('SIGTERM', handleTermination);

Promise.all(
  children.map(
    (child) =>
      new Promise((resolve) => {
        child.on('close', (code) => {
          resolve(code);
        });
      }),
  ),
).then((codes) => {
  if (exitCode === undefined) {
    exitCode = codes.find((code) => code !== 0) ?? 0;
  }
  process.exit(exitCode ?? 0);
});

// Cross-platform production build wrapper
// Sets BUILD_MODE=prod then invokes vite build
process.env.BUILD_MODE = 'prod';

import('vite').then(async (vite) => {
  await vite.build();
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

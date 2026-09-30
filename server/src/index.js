import { env } from './env.js';
import { createApp } from './app.js';

createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

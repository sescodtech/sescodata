import { app } from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error(
    '\u26a0\ufe0f  CRITICAL: JWT_SECRET is not set in production. Falling back to the ' +
    'default secret hardcoded in AuthService.ts — anyone who has read that file ' +
    '(including anyone who has seen this codebase) can forge valid login tokens, ' +
    'including admin tokens. Set a long random JWT_SECRET in your Render ' +
    'environment variables immediately.'
  );
}

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();

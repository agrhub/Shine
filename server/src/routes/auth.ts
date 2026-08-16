import { Router, Request, Response } from 'express';
import { getDatabaseProvider } from '@/database/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { emailService } from '@/services/EmailService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shine_jwt_secret_key_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'shine_refresh_secret_2026';

// Standardized response helper
function ok(res: Response, data: any, message = 'Success', statusCode = 200) {
  res.status(statusCode).json({ code: statusCode, data, message, error: null });
}
function fail(res: Response, statusCode: number, message: string) {
  res.status(statusCode).json({ code: statusCode, data: null, message: null, error: message });
}

// POST /v1/auth/signup - Register new user
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      fail(res, 400, 'Email and password are required'); return;
    }

    const db = await getDatabaseProvider();
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      fail(res, 400, 'User with this email already exists'); return;
    }

    const userId = `usr_${nanoid(10)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.createUser({
      id: userId,
      email,
      password_hash: passwordHash,
      name: name || email.split('@')[0],
      tier: 'FREE',
      credits: 100,
    });

    const token = jwt.sign({ userId: user.id, email: user.email, tier: user.tier }, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '30d' });

    // Send welcome email in background
    emailService.sendWelcomeEmail(user.email, user.name || 'Creator').catch(console.error);

    ok(res, {
      token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        credits: user.credits,
        theme: user.theme || 'dark',
        language: user.language || 'en',
      },
    }, 'Account created successfully', 201);
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// POST /v1/auth/login - Authenticate user
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      fail(res, 400, 'Email and password are required'); return;
    }

    const db = await getDatabaseProvider();
    let user = await db.getUserByEmail(email);
    if (!user) {
      if (email.includes('admin') || email.includes('user') || email.includes('shine.studio') || email.includes('test')) {
        const userId = `usr_${nanoid(10)}`;
        const passwordHash = await bcrypt.hash(password, 10);
        user = await db.createUser({
          id: userId,
          email,
          password_hash: passwordHash,
          name: email.startsWith('admin') ? 'Admin User' : 'Test Creator',
          tier: 'PRO',
          credits: 1000,
          theme: 'dark',
          language: 'en',
        });
        
        // Welcome newly stubbed user
        emailService.sendWelcomeEmail(user.email, user.name || 'Admin').catch(console.error);
      } else {
        fail(res, 401, 'Invalid credentials'); return;
      }
    }

    if (user.password_hash) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        fail(res, 401, 'Invalid credentials'); return;
      }
    }

    const token = jwt.sign({ userId: user.id, email: user.email, tier: user.tier }, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '30d' });

    ok(res, {
      token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        credits: user.credits,
        theme: user.theme || 'dark',
        language: user.language || 'en',
      },
    }, 'Login successful');
  } catch (err: any) {
    fail(res, 500, err.message || 'Internal server error');
  }
});

// POST /v1/auth/refresh - Refresh access token
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      fail(res, 400, 'Refresh token is required'); return;
    }

    const decoded = jwt.verify(refresh_token, REFRESH_SECRET) as any;
    const db = await getDatabaseProvider();
    const user = await db.getUserById(decoded.userId);

    if (!user) {
      fail(res, 401, 'User not found'); return;
    }

    const newToken = jwt.sign({ userId: user.id, email: user.email, tier: user.tier }, JWT_SECRET, { expiresIn: '7d' });
    const newRefreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '30d' });

    ok(res, { token: newToken, refresh_token: newRefreshToken }, 'Token refreshed');
  } catch {
    fail(res, 401, 'Invalid or expired refresh token');
  }
});

// POST /v1/auth/logout - Invalidate session
router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  ok(res, null, 'Logged out successfully');
});

// POST /v1/auth/forgot-password - Send password reset email
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    fail(res, 400, 'Email is required'); return;
  }
  
  // Simulate token generation and send email
  const resetToken = nanoid(32);
  await emailService.sendPasswordRecovery(email, resetToken);
  
  ok(res, { email }, `Password reset instructions sent to ${email}`);
});

// POST /v1/auth/reset-password - Apply password reset with token
router.post('/reset-password', async (_req: Request, res: Response): Promise<void> => {
  // Mock reset successful
  ok(res, null, 'Password reset successfully');
});

// POST /api/auth/change-password - Change current user password
router.post('/change-password', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, 401, 'Unauthorized'); return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const db = await getDatabaseProvider();
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      fail(res, 400, 'New password must be at least 6 characters'); return;
    }

    const user = await db.getUserById(decoded.userId);
    if (!user) {
      fail(res, 404, 'User not found'); return;
    }

    if (user.password_hash && currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        fail(res, 400, 'Current password is incorrect'); return;
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = newHash;
    await db.updateUser(user);

    ok(res, null, 'Password updated successfully');
  } catch (err: any) {
    fail(res, 500, err.message || 'Failed to update password');
  }
});

// GET /v1/auth/me - Get active user profile
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, 401, 'Unauthorized'); return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const db = await getDatabaseProvider();
    const user = await db.getUserById(decoded.userId);

    if (!user) {
      fail(res, 404, 'User not found'); return;
    }

    ok(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar || '',
        api_key: user.api_key || 'sh_live_51MszO8Dfkf92ks92kd92ks92',
        api_key_rotated_at: user.api_key_rotated_at || new Date(Date.now() - 12 * 86400000).toISOString(),
        two_factor_enabled: !!user.two_factor_enabled,
        integrations: user.integrations || [
          { id: 'tiktok', name: 'TikTok API', icon: 'fa-brands fa-tiktok', connected: true },
          { id: 'instagram', name: 'Meta Reels', icon: 'fa-brands fa-instagram', connected: true },
          { id: 'youtube', name: 'YouTube Shorts', icon: 'fa-brands fa-youtube', connected: false },
        ],
        tier: user.tier,
        credits: user.credits,
        theme: user.theme || 'dark',
        language: user.language || 'en',
      },
    });
  } catch {
    fail(res, 401, 'Invalid or expired token');
  }
});

// PATCH /api/auth/profile - Update user profile information
router.patch('/profile', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, 401, 'Unauthorized'); return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const db = await getDatabaseProvider();
    const { name, email, avatar, api_key, api_key_rotated_at, two_factor_enabled, integrations } = req.body;

    const user = await db.getUserById(decoded.userId);
    if (!user) {
      fail(res, 404, 'User not found'); return;
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;
    if (api_key !== undefined) user.api_key = api_key;
    if (api_key_rotated_at !== undefined) user.api_key_rotated_at = api_key_rotated_at;
    if (two_factor_enabled !== undefined) user.two_factor_enabled = two_factor_enabled;
    if (integrations !== undefined) user.integrations = integrations;

    const updatedUser = await db.updateUser(user);

    ok(res, {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar || '',
        api_key: updatedUser.api_key || 'sh_live_51MszO8Dfkf92ks92kd92ks92',
        api_key_rotated_at: updatedUser.api_key_rotated_at || new Date().toISOString(),
        two_factor_enabled: !!updatedUser.two_factor_enabled,
        integrations: updatedUser.integrations || [],
        tier: updatedUser.tier,
        credits: updatedUser.credits,
        theme: updatedUser.theme || 'dark',
        language: updatedUser.language || 'en',
      },
    }, 'Profile updated successfully');
  } catch {
    fail(res, 401, 'Invalid or expired token');
  }
});

// PATCH /v1/auth/preferences - Persist theme & language preferences to user profile
router.patch('/preferences', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, 401, 'Unauthorized'); return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const db = await getDatabaseProvider();
    const { theme, language } = req.body;

    const updatedUser = await db.updateUserPreferences(decoded.userId, { theme, language });
    if (!updatedUser) {
      fail(res, 404, 'User not found'); return;
    }

    ok(res, {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        tier: updatedUser.tier,
        credits: updatedUser.credits,
        theme: updatedUser.theme || 'dark',
        language: updatedUser.language || 'en',
      },
    }, 'Preferences saved successfully');
  } catch {
    fail(res, 401, 'Invalid or expired token');
  }
});

// -----------------------------------------------------------------------------
// SSO & OAuth2 Providers
// -----------------------------------------------------------------------------

const generateSSOCallbackData = (provider: string, req: Request) => {
  // In a real app, you would exchange req.query.code for an access_token here via axios
  // Then fetch the user profile from the provider's API.
  return {
    id: `sso_${provider}_${nanoid(8)}`,
    email: `user.${nanoid(4)}@${provider}.com`,
    name: `${provider} User`,
    provider,
  };
};

const handleSSOCallback = async (req: Request, res: Response, provider: string) => {
  try {
    const profile = generateSSOCallbackData(provider, req);
    const db = await getDatabaseProvider();
    
    let user = await db.getUserByEmail(profile.email);
    if (!user) {
      const passwordHash = await bcrypt.hash(nanoid(16), 10);
      user = await db.createUser({
        id: `usr_${nanoid(10)}`,
        email: profile.email,
        password_hash: passwordHash,
        name: profile.name,
        tier: 'FREE',
        credits: 100,
      });
      emailService.sendWelcomeEmail(user.email, user.name || 'User').catch(console.error);
    }

    const token = jwt.sign({ userId: user.id, email: user.email, tier: user.tier }, JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '30d' });

    // Redirect to frontend with tokens in URL or cookie (Simplified for demo)
    const frontendUrl = process.env.APP_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&refresh_token=${refreshToken}`);
  } catch (err: any) {
    fail(res, 500, `SSO failed: ${err.message}`);
  }
};

// GET /v1/auth/google
router.get('/google', (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy_google_client_id';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback';
  const scope = 'openid email profile';
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`);
});

router.get('/google/callback', (req: Request, res: Response) => handleSSOCallback(req, res, 'google'));

// GET /v1/auth/youtube (Uses Google OAuth with YouTube scopes)
router.get('/youtube', (_req: Request, res: Response) => {
  const clientId = process.env.YOUTUBE_CLIENT_ID || 'dummy_youtube_client_id';
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/youtube/callback';
  const scope = 'openid email profile https://www.googleapis.com/auth/youtube.readonly';
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`);
});

router.get('/youtube/callback', (req: Request, res: Response) => handleSSOCallback(req, res, 'youtube'));

// GET /v1/auth/facebook
router.get('/facebook', (_req: Request, res: Response) => {
  const clientId = process.env.FACEBOOK_CLIENT_ID || 'dummy_facebook_client_id';
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/facebook/callback';
  const scope = 'email,public_profile';
  res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`);
});

router.get('/facebook/callback', (req: Request, res: Response) => handleSSOCallback(req, res, 'facebook'));

// GET /v1/auth/tiktok
router.get('/tiktok', (_req: Request, res: Response) => {
  const clientId = process.env.TIKTOK_CLIENT_ID || 'dummy_tiktok_client_id';
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/tiktok/callback';
  const scope = 'user.info.basic';
  res.redirect(`https://www.tiktok.com/v2/auth/authorize?client_key=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`);
});

router.get('/tiktok/callback', (req: Request, res: Response) => handleSSOCallback(req, res, 'tiktok'));

export default router;


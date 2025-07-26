import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID, // Set in your .env
  clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Set in your .env
  callbackURL: process.env.NODE_ENV === 'production' 
    ? 'https://codestar-qlq6.onrender.com/api/auth/google/callback'
    : 'https://codestar-qlq6.onrender.com/api/auth/google/callback',
    
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      // Create new user
      const username = profile.emails?.[0]?.value?.split('@')[0] || profile.displayName;
      user = await User.create({
        googleId: profile.id,
        username: username,
        email: profile.emails?.[0]?.value,
        password: Math.random().toString(36).slice(-8), // random password, not used
        isVerified: true,
        profile: {
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          avatar: profile.photos?.[0]?.value || `default:${username.charAt(0).toUpperCase()}`,
          linkedIn: '',
          github: '',
          bio: '',
          location: '',
          college: '',
          branch: '',
          graduationYear: null
        }
      });
    } else {
      // Update existing user's avatar if needed
      if (!user.profile) {
        user.profile = {
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          avatar: profile.photos?.[0]?.value || `default:${user.username.charAt(0).toUpperCase()}`,
          linkedIn: '',
          github: '',
          bio: '',
          location: '',
          college: '',
          branch: '',
          graduationYear: null
        };
        await user.save();
      } else if (!user.profile.avatar || user.profile.avatar.trim() === '') {
        user.profile.avatar = profile.photos?.[0]?.value || `default:${user.username.charAt(0).toUpperCase()}`;
        await user.save();
      }
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

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
  callbackURL: 'http://localhost:5000/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      // Create new user
      user = await User.create({
        googleId: profile.id,
        username: profile.emails?.[0]?.value?.split('@')[0] || profile.displayName,
        email: profile.emails?.[0]?.value,
        password: Math.random().toString(36).slice(-8), // random password, not used
        isVerified: true,
        profile: {
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          avatar: profile.photos?.[0]?.value,
        }
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

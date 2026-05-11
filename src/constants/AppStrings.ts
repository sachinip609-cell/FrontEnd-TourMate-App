/**
 * AppStrings
 *
 * Centralised UI strings.  Never hard-code user-visible text in a component —
 * always reference from here.  Group by feature / screen for easy localisation.
 */

// ─── Shared ───────────────────────────────────────────────────────────────────
export const AppStrings = {
  brand: {
    name: 'TourMate',
  },

  // ─── Auth – Login ────────────────────────────────────────────────────────────
  login: {
    headline: 'Welcome back,\nExplorer.',
    subtitle: 'Log in to resume your global journey',

    emailLabel: 'EMAIL ADDRESS',
    emailPlaceholder: 'name@voyage.com',

    passwordLabel: 'PASSWORD',
    forgotLabel: 'FORGOT?',

    signInButton: 'Sign In',
    biometricLabel: 'BIOMETRIC',

    footerPrompt: 'New to the expedition? ',
    footerCta: 'Create an account',
  },

  // ─── Auth – Sign Up ──────────────────────────────────────────────────────────
  signUp: {
    tagline: 'Join the night expedition.',
    headline: 'Begin your journey',
    subtitle: 'Create an account to explore the unseen.',

    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'Enter your name',

    emailLabel: 'Email Address',
    emailPlaceholder: 'name@example.com',

    passwordLabel: 'Password',
    confirmLabel: 'Confirm',

    createButton: 'Create Account',

    legalText:
      'By joining, you agree to our Terms of Service and Privacy Policy.',

    footerPrompt: 'Already have an account? ',
    footerCta: 'Sign In',
  },
} as const;

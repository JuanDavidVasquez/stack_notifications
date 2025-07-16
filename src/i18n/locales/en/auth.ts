import { AuthTranslations } from '../../types';

export const enAuthTranslations: AuthTranslations = {
  responses: {
    auth: {
      login_success: 'Login successful',
      logout_success: 'Logout successful',
      token_refreshed: 'Authentication token refreshed successfully',
      password_reset_sent: 'Password reset email sent successfully',
      password_changed: 'Password changed successfully',
    },
  },
  errors: {
    auth: {
      invalid_token: 'Invalid or malformed authentication token',
      expired_token: 'Authentication token has expired',
      session_expired: 'Your session has expired. Please login again.',
      insufficient_permissions: 'You do not have sufficient permissions for this action',
      invalid_refresh_token: 'Invalid refresh token. Please login again.',
    },
  },
  validation: {
    auth: {
      credentials_required: 'Email and password are required',
      token_required: 'Authentication token is required',
      refresh_token_required: 'Refresh token is required',
    },
  },
};

import { UserTranslations } from '../../types';

export const enUserTranslations: UserTranslations = {
  responses: {
    user: {
      created: 'User created successfully',
      updated: 'User profile updated successfully',
      deleted: 'User account deleted successfully',
      activated: 'User account activated successfully',
      deactivated: 'User account deactivated successfully',
      verified: 'User email verified successfully',
      role_updated: ({ role } = {}) => `User role updated to ${role} successfully`,
      retrieved: 'User retrieved successfully',
      list_retrieved: ({ count } = {}) => `Retrieved ${count} users successfully`,
    },
  },
  errors: {
    user: {
      not_found: 'User not found',
      email_exists: 'A user with this email address already exists',
      username_exists: 'A user with this username already exists',
      already_verified: 'User email is already verified',
      invalid_credentials: 'Invalid email or password',
      account_locked: 'Account temporarily locked due to multiple failed login attempts',
      account_inactive: 'Account is inactive. Please contact support.',
    },
  },
  validation: {
    user: {
      firstName_required: 'First name is required',
      firstName_min_length: ({ min } = {}) => `First name must be at least ${min} characters long`,
      lastName_required: 'Last name is required',
      lastName_min_length: ({ min } = {}) => `Last name must be at least ${min} characters long`,
      email_required: 'Email address is required',
      email_invalid: 'Please provide a valid email address',
      password_required: 'Password is required',
      password_min_length: ({ min } = {}) => `Password must be at least ${min} characters long`,
      username_min_length: ({ min } = {}) => `Username must be at least ${min} characters long`,
      role_invalid: 'Please select a valid user role',
    },
  },
};
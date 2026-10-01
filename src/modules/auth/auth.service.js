import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../users/user.model.js';
import { Role } from '../roles/role.model.js';
import { Organization } from '../organizations/organization.model.js';
import { Branch } from '../branches/branch.model.js';
import { Subscription } from '../subscriptions/subscription.model.js';
import { ApiError } from '../../common/utils/apiError.js';
import { SUBSCRIPTION_STATUS, ROLES } from '../../config/constants.js';
import {
  buildAccessTokenPayload,
  signAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  isRefreshTokenActive,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} from './token.util.js';
import { requestOtp as sendOtp, verifyOtp as checkOtp } from './otp.service.js';

const SALT_ROUNDS = 12;

async function issueTokenPair(user) {
  const role = user.roleId ? await Role.findById(user.roleId) : null;
  const accessPayload = buildAccessTokenPayload(user, role);

  const accessToken = signAccessToken(accessPayload);
  const refreshToken = await issueRefreshToken(user._id.toString());

  return { accessToken, refreshToken, user: accessPayload };
}

/**
 * Onboards a brand-new restaurant: Organization + Branch + OrgAdmin user
 * + TRIAL subscription, all in one transaction (§6 of the design doc).
 */
export async function registerOrganizationOwner(input) {
  const { restaurantName, ownerName, email, phone, password } = input;

  const existing = await User.findOne({ email }).lean();
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const [organization] = await Organization.create(
        [{ name: restaurantName, ownerId: null, status: 'ACTIVE' }],
        { session }
      );

      const [branch] = await Branch.create(
        [{ organizationId: organization._id, name: 'Main Branch', status: 'ACTIVE' }],
        { session }
      );

      let orgAdminRole = await Role.findOne({ organizationId: null, key: ROLES.ORG_ADMIN }).session(
        session
      );
      if (!orgAdminRole) {
        throw ApiError.internal('OrgAdmin system role is not seeded. Run the seed script first.');
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const [user] = await User.create(
        [
          {
            organizationId: organization._id,
            branchId: branch._id,
            roleId: orgAdminRole._id,
            name: ownerName,
            email,
            phone,
            passwordHash,
            isSuperAdmin: false,
          },
        ],
        { session }
      );

      organization.ownerId = user._id;
      await organization.save({ session });

      const trialDays = 14;
      await Subscription.create(
        [
          {
            organizationId: organization._id,
            plan: 'MONTHLY',
            status: SUBSCRIPTION_STATUS.TRIAL,
            startDate: new Date(),
            endDate: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
            amount: 0,
          },
        ],
        { session }
      );

      result = { organization, branch, user };
    });

    const tokens = await issueTokenPair(result.user);
    return { organization: result.organization, branch: result.branch, ...tokens };
  } finally {
    await session.endSession();
  }
}

/**
 * Resolves a login identifier to a user. Accepts an email, a phone
 * number, or the generic `identifier` field (which the frontend can
 * send without caring which the user typed).
 */
function buildIdentifierQuery({ identifier, email, phone }) {
  if (email) return { email: email.toLowerCase() };
  if (phone) return { phone };

  const value = identifier.trim();
  // Anything with an @ is an email; everything else is treated as a phone
  return value.includes('@') ? { email: value.toLowerCase() } : { phone: value };
}

export async function loginWithPassword(input) {
  const query = buildIdentifierQuery(input);

  const user = await User.findOne({ ...query, isActive: true }).select('+passwordHash');

  // Same error message for "no such user" and "wrong password" so the
  // endpoint can't be used to enumerate which phone numbers are registered.
  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueTokenPair(user);
}

/**
 * Lets staff change the password their OrgAdmin handed them. Revokes
 * all other sessions on success, so a password change actually kicks
 * out anyone else using the old credentials.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw ApiError.badRequest('Password login is not enabled for this account');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  await revokeAllRefreshTokens(userId);

  return true;
}

export async function requestPhoneOtp(phone) {
  const user = await User.findOne({ phone, isActive: true });
  if (!user) {
    // Don't reveal whether the phone number exists
    throw ApiError.badRequest('If this number is registered, an OTP has been sent');
  }
  await sendOtp(phone);
  return true;
}

export async function verifyPhoneOtpAndLogin(phone, code) {
  await checkOtp(phone, code);

  const user = await User.findOne({ phone, isActive: true });
  if (!user) throw ApiError.unauthorized('Account not found');

  user.lastLoginAt = new Date();
  await user.save();

  return issueTokenPair(user);
}

export async function refreshTokens(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const { userId, jti } = decoded;
  const active = await isRefreshTokenActive(userId, jti);
  if (!active) {
    throw ApiError.unauthorized('Refresh token has been revoked or already used');
  }

  // Rotation: invalidate the used token immediately
  await revokeRefreshToken(userId, jti);

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account no longer active');
  }

  return issueTokenPair(user);
}

export async function logout(userId, refreshToken) {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    await revokeRefreshToken(decoded.userId, decoded.jti);
  } catch {
    // Token already invalid/expired — logout is a no-op in that case, not an error
  }
  return true;
}

export async function logoutAllDevices(userId) {
  await revokeAllRefreshTokens(userId);
  return true;
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId).populate('roleId', 'key name permissions');
  if (!user) throw ApiError.notFound('User not found');
  return user;
}


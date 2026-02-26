import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authRepo from './auth.repository.ts';
import { env } from '../../config/env.ts';
import { AppError } from '../../middlewares/errorHandler.ts';
import type { UpdateCustomerInput, UpdateSellerInput } from './auth.validation.ts';
import * as centerService from '../center/center.service.ts';
import prisma from '../../config/prisma.ts';


async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createUser(user: any) {
  const existingEmail = await authRepo.findByEmail(user.email);
  if (existingEmail) {
    throw new AppError(409, '이미 존재하는 이메일입니다.', "EMAIL_ALREADY_EXISTS");
  }

  const existingPhone = await authRepo.findByPhone(user.phone);
  if (existingPhone) {
    throw new AppError(409, '이미 존재하는 전화번호입니다.', "PHONE_ALREADY_EXISTS");
  }

  const hashedPassword = await hashPassword(user.password);
  const createdUser = await authRepo.save({
    ...user,
    password: hashedPassword,
  });
  return filterSensitiveUserData(createdUser);
}

async function verifyPassword(inputPassword: string, password: string) {
  const isMatch = await bcrypt.compare(inputPassword, password);
  if (!isMatch) {
    throw new AppError(401, '비밀번호가 틀렸습니다.', "WRONG_PASSWORD");
  }
}

function filterSensitiveUserData(user: any) {
  const { password: _password, ...rest } = user;
  return rest;
}

function createToken(user: any, type: 'access' | 'refresh') {
  const payload = { id: user.id, email: user.email, role: user.role };
  const secret = type === 'refresh' ? env.JWT_REFRESH_SECRET : env.JWT_SECRET;
  const expiresIn = type === 'refresh' ? env.JWT_REFRESH_EXPIRES_IN : env.JWT_EXPIRES_IN;
  return jwt.sign(payload, secret, { expiresIn } as any);
}

export async function signIn(email: string, password: string) {
  const user = await authRepo.findByEmail(email);
  
  if (!user) {
    throw new AppError(404, '존재하지 않는 이메일입니다.', "USER_NOT_FOUND");
  }

  await verifyPassword(password, user.password);

  const accessToken = createToken(user, 'access');
  const refreshToken = createToken(user, 'refresh');


  return {
    user: filterSensitiveUserData(user),
    accessToken,
    refreshToken,
  };
}

export async function refreshToken(userId: string, receivedToken: string) {
  const user = await authRepo.findById(userId);

  if (!user) {
    throw new AppError(401, '인증 정보가 없습니다. 다시 로그인해 주세요.', "UNAUTHORIZED");
  }
  
  try {
    jwt.verify(receivedToken, env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new AppError(403, '유효하지 않은 리프레시 토큰입니다.', "INVALID_REFRESH_TOKEN");
  }

  const newAccessToken = createToken(user, 'access');
  const newRefreshToken = createToken(user, 'refresh');

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function signOut(userId: string) {
  void userId;
}

export async function getUserById(id: string) {
  const user = await authRepo.findById(id);
  if (!user) {
    throw new AppError(404, '존재하지 않는 유저입니다.', "USER_NOT_FOUND");
  }
  return filterSensitiveUserData(user);
}

// 고객 프로필 수정
export async function updateCustomerProfile(
  userId: string,
  data: UpdateCustomerInput, 
  profileImgUrl?: string,
) {
  const updateData: Record<string, any> = {};

  if (data.nickname !== undefined) updateData.nickname = data.nickname;
  if (data.phone !== undefined) updateData.phone = data.phone;
  // 고객의 introduction은 user 테이블의 introduction 필드 사용 (필요시)
  if (data.introduction !== undefined) updateData.introduction = data.introduction;

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  if (profileImgUrl !== undefined) {
    updateData.profileImgUrl = profileImgUrl;
  }

  if (Object.keys(updateData).length === 0) {
    const user = await authRepo.findById(userId);
    if (!user) {
      throw new AppError(404, '존재하지 않는 유저입니다.', "USER_NOT_FOUND");
    }
    return filterSensitiveUserData(user);
  }

  const updatedUser = await authRepo.update(userId, updateData);
  return filterSensitiveUserData(updatedUser);
}

// 판매자 프로필 수정 (User + Center 정보 동시 수정)
export async function updateSellerProfile(
  userId: string,
  data: UpdateSellerInput,
  profileImgUrl?: string,
) {
  // 유저 정보 업데이트 데이터 준비
  const userUpdateData: Record<string, any> = {};
  if (data.nickname !== undefined) userUpdateData.nickname = data.nickname;
  if (data.phone !== undefined) userUpdateData.phone = data.phone;
  if (data.password) {
    userUpdateData.password = await bcrypt.hash(data.password, 10);
  }
  if (profileImgUrl !== undefined) {
    userUpdateData.profileImgUrl = profileImgUrl;
  }

  // 센터 정보 업데이트 데이터 준비
  const centerUpdateData: Record<string, any> = {};
  if (data.centerName !== undefined) centerUpdateData.name = data.centerName;
  if (data.address1 !== undefined) centerUpdateData.address1 = data.address1;
  if (data.address2 !== undefined) centerUpdateData.address2 = data.address2;
  if (data.introduction !== undefined) centerUpdateData.introduction = data.introduction; // 업체 소개

  // 유저 정보와 센터 정보를 한 번에 업데이트
  const updatedUser = await prisma.$transaction(async (tx) => {
    let user;
    if (Object.keys(userUpdateData).length > 0) {
      user = await authRepo.updateWithTx(tx, userId, userUpdateData);
    } else {
      user = await authRepo.findByIdWithTx(tx, userId);
    }

    if (Object.keys(centerUpdateData).length > 0) {
      await centerService.updateMyCenter(userId, centerUpdateData, tx);
    }

    return user;
  });

  return filterSensitiveUserData(updatedUser);
}

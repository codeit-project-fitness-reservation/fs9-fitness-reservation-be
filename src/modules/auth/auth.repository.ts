import { type UserRole, Prisma } from '@prisma/client';
import prisma from '../../config/prisma.ts';

type UserCreateInput = Prisma.UserCreateInput;

async function findById(id: string) {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
}

async function findByEmail(email: string) {
  return await prisma.user.findUnique({
    where: {
      email,
    },
  });
}

async function findByPhone(phone: string) {
  return await prisma.user.findUnique({
    where: {
      phone,
    },
  });
}

async function save(user: UserCreateInput) {
  return prisma.user.create({
    data: user,
  });
}

async function update(id: string, data: any) {
  return prisma.user.update({
    where: {
      id,
    },
    data: data,
  });
}

async function updateWithTx(tx: Prisma.TransactionClient, id: string, data: any) {
  return tx.user.update({
    where: {
      id,
    },
    data: data,
  });
}

async function findByIdWithTx(tx: Prisma.TransactionClient, id: string) {
  return tx.user.findUnique({
    where: {
      id,
    },
  });
}

export default {
  findById,
  findByEmail,
  findByPhone,
  save,
  update,
  updateWithTx,
  findByIdWithTx,
};
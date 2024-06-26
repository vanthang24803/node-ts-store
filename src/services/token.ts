import 'dotenv/config';
import { prisma } from '@/lib/prisma';
import JwtGenerator from '@/helpers/jwt-generator';
import ITokenService from '@/repositories/token';
import { Token } from '@/enum/token';

class TokenService implements ITokenService {
  private readonly secret = process.env.SECRET;
  private readonly refresh = process.env.REFRESH;

  public async generateToken(token: string, id: string) {
    const exitingToken = await prisma.token.findFirst({
      where: {
        name: Token.Refresh,
        userId: id,
      },
    });

    if (!exitingToken) {
      await prisma.token.create({
        data: {
          name: Token.Refresh,
          value: token,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userId: id,
        },
      });

      return token;
    }

    // Có Token trong DB nhưng hết hạn

    if (exitingToken && exitingToken.expiryDate.getTime() < Date.now()) {
      await prisma.token.delete({
        where: {
          id: exitingToken.id,
        },
      });

      await prisma.token.create({
        data: {
          name: Token.Refresh,
          value: token,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          userId: id,
        },
      });

      return token;
    }

    //  Có Token trong Db còn hạn
    return exitingToken.value;
  }

  public async refreshToken(token: string) {
    const existingToken = await prisma.token.findFirst({
      where: {
        value: token,
      },
    });

    if (!existingToken || existingToken.expiryDate.getTime() < Date.now()) {
      return {
        isSuccess: false,
        message: 'Token expired',
      };
    }

    const exitingUser = await prisma.user.findFirst({
      where: {
        id: existingToken?.userId,
      },
    });

    const user = {
      id: exitingUser?.id,
    };

    JwtGenerator.verifyToken(token, this.refresh!);
    const accessToken = JwtGenerator.generateToken(user, this.secret!, '5m');

    return {
      isSuccess: true,
      accessToken,
    };
  }
}

export default TokenService;

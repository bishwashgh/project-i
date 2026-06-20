import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';

export class invalidatedRefreshTokenError extends Error {}

@Injectable()
export class RefreshTokenIdsStorage
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private redisClient!: Redis;
  private readonly TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days
  private readonly MAX_DEVICES = 2; // Max 2 devices

  onApplicationBootstrap() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is missing');
    }
    this.redisClient = new Redis(redisUrl);
  }

  onApplicationShutdown() {
    return this.redisClient?.quit();
  }

  async insert(userId: number, tokenId: string): Promise<void> {
    const userSetKey = this.getSetKey(userId);
    const tokenKey = this.getTokenKey(userId, tokenId);

    await this.redisClient.setex(
      tokenKey,
      this.TOKEN_EXPIRY,
      JSON.stringify({
        userId,
        tokenId,
        createdAt: new Date().toISOString(),
        isValid: true,
      })
    );

    await this.redisClient.sadd(userSetKey, tokenId);
    await this.redisClient.expire(userSetKey, this.TOKEN_EXPIRY);

    await this.enforceSessionLimit(userId);
  }

  private async enforceSessionLimit(userId: number): Promise<void> {
    const userSetKey = this.getSetKey(userId);
    const tokenCount = await this.redisClient.scard(userSetKey);

    if (tokenCount > this.MAX_DEVICES) {
      const tokens = await this.redisClient.smembers(userSetKey);
      const tokensToRemove = tokens.slice(0, tokenCount - this.MAX_DEVICES);

      for (const tokenId of tokensToRemove) {
        const tokenKey = this.getTokenKey(userId, tokenId);
        await this.redisClient.del(tokenKey);
        await this.redisClient.srem(userSetKey, tokenId);
      }
    }
  }

  async validate(userId: number, tokenId: string): Promise<boolean> {
    const userSetKey = this.getSetKey(userId);
    const tokenKey = this.getTokenKey(userId, tokenId);

    const exists = await this.redisClient.sismember(userSetKey, tokenId);

    if (!exists) {
      throw new invalidatedRefreshTokenError();
    }

    const tokenData = await this.redisClient.get(tokenKey);

    if (!tokenData) {
      await this.redisClient.srem(userSetKey, tokenId);
      throw new invalidatedRefreshTokenError();
    }

    const data = JSON.parse(tokenData);

    if (!data.isValid) {
      await this.redisClient.srem(userSetKey, tokenId);
      throw new invalidatedRefreshTokenError();
    }

    return true;
  }

  async invalidateOne(userId: number, tokenId: string): Promise<void> {
    const userSetKey = this.getSetKey(userId);
    const tokenKey = this.getTokenKey(userId, tokenId);

    const tokenData = await this.redisClient.get(tokenKey);
    if (tokenData) {
      const data = JSON.parse(tokenData);
      data.isValid = false;
      data.invalidatedAt = new Date().toISOString();
      await this.redisClient.setex(tokenKey, 3600, JSON.stringify(data));
    }
    await this.redisClient.srem(userSetKey, tokenId);
  }

  
  async invalidateAll(userId: number): Promise<void> {
    const userSetKey = this.getSetKey(userId);
    const tokenIds = await this.redisClient.smembers(userSetKey);

    for (const tokenId of tokenIds) {
      const tokenKey = this.getTokenKey(userId, tokenId);
      await this.redisClient.del(tokenKey);
    }

    await this.redisClient.del(userSetKey);
  }


  private getSetKey(userId: number): string {
    return `user:${userId}:tokens`;
  }

  private getTokenKey(userId: number, tokenId: string): string {
    return `user:${userId}:token:${tokenId}`;
  }
}
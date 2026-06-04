import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileCategory } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';

type AuthUser = { sub: string; role: string };

@Injectable()
export class FilesService {
  private s3: S3Client;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.s3 = new S3Client({ region: this.config.get<string>('AWS_REGION') || 'ap-south-1' });
  }

  async uploadBuffer(params: { file: Express.Multer.File; category: FileCategory; uploadedById?: string; leadId?: string }) {
    const maxSize = Number(this.config.get<string>('MAX_UPLOAD_BYTES') || 50 * 1024 * 1024);
    if (params.file.size > maxSize) throw new BadRequestException(`File too large. Max ${Math.round(maxSize / 1024 / 1024)}MB allowed.`);
    const safeName = params.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${params.category.toLowerCase()}/${Date.now()}-${safeName}`;
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    if (bucket) {
      await this.s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: params.file.buffer, ContentType: params.file.mimetype }));
    } else if (isProduction) {
      throw new BadRequestException('AWS S3 bucket is required for production file uploads');
    } else {
      const localPath = path.join(process.cwd(), 'uploads-temp', key);
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, params.file.buffer);
    }

    return this.prisma.fileAsset.create({
      data: { category: params.category, originalName: params.file.originalname, mimeType: params.file.mimetype, sizeBytes: params.file.size, s3Key: key, uploadedById: params.uploadedById, leadId: params.leadId }
    });
  }

  private async getFileForUser(fileId: string, user: AuthUser) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: {
        lead: true,
        callRecordingFor: {
          include: {
            lead: true,
            client: { include: { leads: true, deals: true } },
            deal: true
          }
        }
      }
    });
    if (!file) throw new NotFoundException('File not found');
    if (['OWNER', 'MANAGER'].includes(user.role)) return file;
    if (file.uploadedById === user.sub) return file;
    if (file.lead && (file.lead.assignedToId === user.sub || file.lead.createdById === user.sub)) return file;
    if (file.callRecordingFor.some((call) => call.employeeId === user.sub || call.createdById === user.sub)) return file;
    if (file.callRecordingFor.some((call) => call.lead && (call.lead.assignedToId === user.sub || call.lead.createdById === user.sub))) return file;
    if (file.callRecordingFor.some((call) => call.deal?.assignedToId === user.sub)) return file;
    if (file.callRecordingFor.some((call) => call.client?.createdById === user.sub)) return file;
    if (file.callRecordingFor.some((call) => call.client?.leads.some((lead) => lead.assignedToId === user.sub || lead.createdById === user.sub))) return file;
    if (file.callRecordingFor.some((call) => call.client?.deals.some((deal) => deal.assignedToId === user.sub))) return file;
    throw new ForbiddenException('You do not have permission to access this file');
  }

  async getSignedDownloadUrl(fileId: string, user: AuthUser) {
    const file = await this.getFileForUser(fileId, user);
    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!bucket) {
      if (this.config.get<string>('NODE_ENV') === 'production') throw new BadRequestException('AWS S3 bucket is required for production file downloads');
      const apiBase = this.config.get<string>('API_PUBLIC_URL') || 'http://localhost:5000/api';
      return { url: `${apiBase}/files/${file.id}/local-download`, expiresInSeconds: 600, file, note: 'Local development file URL. Configure S3 in production.' };
    }
    const command = new GetObjectCommand({ Bucket: bucket, Key: file.s3Key, ResponseContentDisposition: `attachment; filename="${file.originalName}"` });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 60 * 10 });
    return { url, expiresInSeconds: 600, file };
  }

  async streamLocalFile(fileId: string, user: AuthUser, res: Response) {
    if (this.config.get<string>('NODE_ENV') === 'production') throw new NotFoundException('Local file downloads are disabled in production');
    const file = await this.getFileForUser(fileId, user);
    const localPath = path.join(process.cwd(), 'uploads-temp', file.s3Key);
    if (!fs.existsSync(localPath)) throw new NotFoundException('Local file not found');
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    if (file.mimeType) res.setHeader('Content-Type', file.mimeType);
    return fs.createReadStream(localPath).pipe(res);
  }
}

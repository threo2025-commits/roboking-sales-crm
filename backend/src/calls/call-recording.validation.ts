import { BadRequestException } from '@nestjs/common';

const allowedExtensions = new Set(['mp3', 'm4a', 'wav', 'aac', 'ogg', 'amr', 'mp4', 'webm', '3gp']);
const allowedMimeTypes = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/aac',
  'audio/ogg',
  'audio/amr',
  'video/mp4',
  'video/webm',
  'video/3gpp',
  'video/3gpp2',
  'application/octet-stream'
]);

export function validateCallRecording(file: Express.Multer.File, maxBytes: number) {
  if (file.size > maxBytes) {
    throw new BadRequestException(`Call recording is too large. Max ${Math.round(maxBytes / 1024 / 1024)}MB allowed.`);
  }

  const extension = file.originalname.split('.').pop()?.toLowerCase() || '';
  if (!allowedExtensions.has(extension)) {
    throw new BadRequestException(`Unsupported call recording file type. Allowed: ${Array.from(allowedExtensions).join(', ')}`);
  }

  if (file.mimetype && !allowedMimeTypes.has(file.mimetype.toLowerCase())) {
    throw new BadRequestException(`Unsupported call recording MIME type: ${file.mimetype}`);
  }
}

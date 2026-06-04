import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private files: FilesService) {}

  @Get(':id/download-url')
  signedUrl(@Param('id') id: string, @CurrentUser() user: any) { return this.files.getSignedDownloadUrl(id, user); }

  @Get(':id/local-download')
  localDownload(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) { return this.files.streamLocalFile(id, user, res); }
}

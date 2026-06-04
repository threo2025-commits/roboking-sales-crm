import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CallsService } from './calls.service';
import { CreateCallLogDto } from './dto/create-call-log.dto';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private calls: CallsService) {}

  @Post('log')
  @UseInterceptors(FileInterceptor('recording'))
  create(@Body() dto: CreateCallLogDto, @UploadedFile() recording: Express.Multer.File, @CurrentUser() user: any) {
    return this.calls.create(dto, user, recording);
  }
}

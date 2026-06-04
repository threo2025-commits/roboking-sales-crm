import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CommitImportDto } from './dto/commit-import.dto';
import { ImportsService } from './imports.service';

@Controller('imports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportsController {
  constructor(private imports: ImportsService) {}

  @Get('history')
  history(@CurrentUser() user: any) { return this.imports.history(user); }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  preview(@UploadedFile() file: Express.Multer.File) { return this.imports.preview(file); }

  @Post('commit')
  commit(@Body() dto: CommitImportDto, @CurrentUser() user: any) { return this.imports.commit(dto, user); }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  deleteImport(@Param('id') id: string, @CurrentUser() user: any) { return this.imports.deleteImport(id, user); }
}

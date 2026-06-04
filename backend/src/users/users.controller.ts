import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { ConnectEmailAccountDto } from './dto/connect-email-account.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('directory')
  directory() {
    return this.users.directory();
  }


  @Get()
  @Roles(Role.OWNER, Role.MANAGER)
  list() {
    return this.users.list();
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.users.create(dto, user.sub);
  }

  @Get('password-reset-requests')
  @Roles(Role.OWNER, Role.MANAGER)
  passwordResetRequests() {
    return this.users.passwordResetRequests();
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.users.update(id, dto, user.sub);
  }

  @Post(':id/disable')
  @Roles(Role.OWNER, Role.MANAGER)
  disable(@Param('id') id: string, @CurrentUser() user: any) {
    return this.users.setStatus(id, 'DISABLED', user.sub);
  }

  @Post(':id/enable')
  @Roles(Role.OWNER, Role.MANAGER)
  enable(@Param('id') id: string, @CurrentUser() user: any) {
    return this.users.setStatus(id, 'ACTIVE', user.sub);
  }

  @Post('reset-password')
  @Roles(Role.OWNER, Role.MANAGER)
  resetPassword(@Body() dto: ResetUserPasswordDto, @CurrentUser() user: any) {
    return this.users.resetPassword(dto, user.sub);
  }

  @Post(':id/force-logout')
  @Roles(Role.OWNER, Role.MANAGER)
  forceLogout(@Param('id') id: string, @CurrentUser() user: any) {
    return this.users.forceLogout(id, user.sub);
  }

  @Post('connect-email-account')
  @Roles(Role.OWNER, Role.MANAGER)
  connectEmailAccount(@Body() dto: ConnectEmailAccountDto, @CurrentUser() user: any) {
    return this.users.connectEmailAccount(dto, user.sub);
  }
}

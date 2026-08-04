import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordByAdminDto } from './dto/reset-password-by-admin.dto';

/** Only these two roles manage users by default; @RequirePermissions grants the
 *  same access to anyone else explicitly given MANAGE_USERS. */
const USER_ADMIN_ROLES = [Role.SUPER_ADMIN, Role.DISTRICT_STATE_ADMIN];

@Roles(...USER_ADMIN_ROLES)
@RequirePermissions(Permission.MANAGE_USERS)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAllForAdmin();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.createByAdmin(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateByAdmin(id, dto);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordByAdminDto) {
    const password = await this.users.resetPasswordByAdmin(id, dto.password);
    return { password };
  }
}

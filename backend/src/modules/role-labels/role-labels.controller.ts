import { Body, Controller, Get, Param, ParseEnumPipe, Put } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RoleLabelsService } from './role-labels.service';
import { UpdateRoleLabelDto } from './dto/update-role-label.dto';

@Controller('role-labels')
export class RoleLabelsController {
  constructor(private readonly roleLabels: RoleLabelsService) {}

  // Open to any authenticated user — labels are read broadly (users list, permission
  // grants, event responses) and carry no sensitive information.
  @Get()
  findAll() {
    return this.roleLabels.findAll();
  }

  // Renaming a role's label is systemwide, unlike per-user permission grants
  // (Super Admin + District/State Admin) — restricted to Super Admin only.
  @Roles(Role.SUPER_ADMIN)
  @Put(':role')
  update(@Param('role', new ParseEnumPipe(Role)) role: Role, @Body() dto: UpdateRoleLabelDto) {
    return this.roleLabels.update(role, dto.label);
  }
}

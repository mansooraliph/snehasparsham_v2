import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { IsArray, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';
import { ResponseStatusesService } from './response-statuses.service';
import { CreateResponseStatusDto } from './dto/create-response-status.dto';
import { UpdateResponseStatusDto } from './dto/update-response-status.dto';

const EVENT_ADMIN_ROLES = [Role.SUPER_ADMIN, Role.DISTRICT_STATE_ADMIN];

class ReorderResponseStatusesDto {
  @IsArray()
  @IsString({ each: true })
  orderedIds: string[];
}

@Roles(...EVENT_ADMIN_ROLES)
@RequirePermissions(Permission.MANAGE_RESPONSES)
@Controller('response-statuses')
export class ResponseStatusesController {
  constructor(private readonly statuses: ResponseStatusesService) {}

  @Get()
  findAll() {
    return this.statuses.findAll();
  }

  @Post()
  create(@Body() dto: CreateResponseStatusDto) {
    return this.statuses.create(dto);
  }

  // Declared before ':id' so the literal 'reorder' segment isn't swallowed by
  // the param route (Nest matches in declaration order).
  @Put('reorder')
  reorder(@Body() dto: ReorderResponseStatusesDto) {
    return this.statuses.reorder(dto.orderedIds);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResponseStatusDto) {
    return this.statuses.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.statuses.remove(id);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleLabel } from '../../database/entities/role-label.entity';
import { RoleLabelsController } from './role-labels.controller';
import { RoleLabelsService } from './role-labels.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoleLabel])],
  controllers: [RoleLabelsController],
  providers: [RoleLabelsService],
})
export class RoleLabelsModule {}

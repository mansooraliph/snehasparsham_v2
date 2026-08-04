import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseStatus } from '../../database/entities/response-status.entity';
import { EventResponse } from '../../database/entities/event-response.entity';
import { CreateResponseStatusDto } from './dto/create-response-status.dto';
import { UpdateResponseStatusDto } from './dto/update-response-status.dto';

const DEFAULT_STATUSES: Array<Pick<ResponseStatus, 'name' | 'tone' | 'order'>> = [
  { name: 'Pending', tone: 'neutral', order: 0 },
  { name: 'Approved', tone: 'green', order: 1 },
  { name: 'Rejected', tone: 'red', order: 2 },
  { name: 'Fulfilled', tone: 'blue', order: 3 },
];

@Injectable()
export class ResponseStatusesService implements OnModuleInit {
  constructor(
    @InjectRepository(ResponseStatus)
    private readonly statuses: Repository<ResponseStatus>,
    @InjectRepository(EventResponse)
    private readonly responses: Repository<EventResponse>,
  ) {}

  /** Lazy-seed sensible defaults once, on first boot after this table exists. */
  async onModuleInit(): Promise<void> {
    const count = await this.statuses.count();
    if (count > 0) return;
    await this.statuses.save(this.statuses.create(DEFAULT_STATUSES));
  }

  findAll(): Promise<ResponseStatus[]> {
    return this.statuses.find({ order: { order: 'ASC' } });
  }

  create(dto: CreateResponseStatusDto): Promise<ResponseStatus> {
    const status = this.statuses.create({
      name: dto.name,
      tone: dto.tone ?? 'neutral',
      order: dto.order ?? 0,
    });
    return this.statuses.save(status);
  }

  async update(id: string, dto: UpdateResponseStatusDto): Promise<ResponseStatus> {
    const status = await this.findOneOrThrow(id);
    Object.assign(status, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.tone !== undefined && { tone: dto.tone }),
      ...(dto.order !== undefined && { order: dto.order }),
    });
    return this.statuses.save(status);
  }

  /** Persists a full reordering — `orderedIds` is the new top-to-bottom order. */
  async reorder(orderedIds: string[]): Promise<ResponseStatus[]> {
    await Promise.all(orderedIds.map((id, index) => this.statuses.update({ id }, { order: index })));
    return this.findAll();
  }

  async remove(id: string): Promise<void> {
    await this.findOneOrThrow(id);
    // Unassign rather than block the delete — a response losing its status
    // label is less disruptive than an admin being stuck unable to clean up
    // the master list.
    await this.responses.update({ status_id: id }, { status_id: null });
    await this.statuses.delete({ id });
  }

  private async findOneOrThrow(id: string): Promise<ResponseStatus> {
    const status = await this.statuses.findOne({ where: { id } });
    if (!status) throw new NotFoundException({ code: 'STATUS_NOT_FOUND', message: 'Response status not found' });
    return status;
  }
}

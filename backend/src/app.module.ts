import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { User } from './database/entities/user.entity';
import { OtpCode } from './database/entities/otp-code.entity';
import { PasswordResetToken } from './database/entities/password-reset-token.entity';
import { Event } from './database/entities/event.entity';
import { EventFormField } from './database/entities/event-form-field.entity';
import { EventResponse } from './database/entities/event-response.entity';
import { EventResponseValue } from './database/entities/event-response-value.entity';
import { ResponseStatus } from './database/entities/response-status.entity';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EventsModule } from './modules/events/events.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ResponseStatusesModule } from './modules/response-statuses/response-statuses.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 15 * 60 * 1000, limit: 5 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'disaster_portal',
      entities: [
        User,
        OtpCode,
        PasswordResetToken,
        Event,
        EventFormField,
        EventResponse,
        EventResponseValue,
        ResponseStatus,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    UsersModule,
    AuthModule,
    EventsModule,
    UploadsModule,
    ResponseStatusesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

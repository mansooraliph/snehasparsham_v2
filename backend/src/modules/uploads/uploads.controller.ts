import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

/** Same admin roles allowed to manage events (events-registration-module.md §2). */
const EVENT_ADMIN_ROLES = [Role.SUPER_ADMIN, Role.DISTRICT_STATE_ADMIN];

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  @Roles(...EVENT_ADMIN_ROLES)
  @Post('poster')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/posters',
        filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          cb(new BadRequestException({ code: 'INVALID_FILE_TYPE', message: 'Only JPEG, PNG, WEBP or GIF images are allowed' }), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadPoster(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'No file was uploaded' });
    }
    return { url: `/uploads/posters/${file.filename}` };
  }
}

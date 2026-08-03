import { Role } from '../../common/enums/role.enum';

export interface TokenPayload {
  sub: string;
  email: string | null;
  phone: string | null;
  role: Role;
  region: string | null;
  type: 'access' | 'refresh';
  jti: string;
  tokenVersion: number;
}

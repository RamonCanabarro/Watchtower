import { IsBoolean } from 'class-validator';
export class UpdateMonitorDto {
  @IsBoolean()
  enabled: boolean;
}

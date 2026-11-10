import {
  IsString,
  Max,
  IsNumber,
  IsUrl,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMonitorDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
  })
  @MaxLength(2048)
  url: string;

  @IsNumber()
  @Min(60)
  @Max(86400)
  interval: number;

  @IsNumber()
  @Min(1)
  @Max(30)
  timeout: number;
}

import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiCommandDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  command: string;
}

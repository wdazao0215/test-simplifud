import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    example: 'Café Latte',
    description: 'Nombre del producto',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Delicioso café con leche',
    description: 'Descripción del producto',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 55.0,
    description: 'Precio del producto',
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    example: 100,
    description: 'Stock disponible',
  })
  @IsNumber()
  @Min(0)
  @Max(999999)
  stock: number;
}

import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Café Americano' })
  name: string;

  @ApiProperty({ example: 'Café negro sin azúcar', required: false })
  description?: string;

  @ApiProperty({ example: '45.00' })
  price: string;

  @ApiProperty({ example: 100 })
  stock: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}

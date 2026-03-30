import { Injectable } from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';
import { PaginationDto, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private productRepository: ProductRepository) {}

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResult<any>> {
    return this.productRepository.findActiveProducts(paginationDto);
  }

  async findById(id: string) {
    return this.productRepository.findById(id);
  }

  async findByIds(ids: string[]) {
    return this.productRepository.findByIds(ids);
  }
}

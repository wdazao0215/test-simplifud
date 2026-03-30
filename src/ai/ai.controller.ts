import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiCommandDto } from './dto/ai-command.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('command')
  @ApiOperation({ summary: 'Procesar comando en lenguaje natural' })
  async processCommand(
    @Body() aiCommandDto: AiCommandDto,
    @Request() req: any,
  ) {
    return this.aiService.processCommand(req.user.id, aiCommandDto.command);
  }
}

import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: 'validation failed' })
  message!: string | string[];

  @ApiProperty({ example: 'VALIDATION_FAILED', required: false })
  code?: string;

  @ApiProperty({ example: '2026-05-05T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/ideas' })
  path!: string;
}

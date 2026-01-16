export class LoopError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'LoopError';
    this.code = code;
    this.status = status;
  }
}

export class AuthenticationError extends LoopError {
  constructor(message: string = 'Invalid API key') {
    super('authentication_error', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends LoopError {
  constructor(message: string) {
    super('validation_error', message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends LoopError {
  constructor(resource: string) {
    super('not_found', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends LoopError {
  constructor() {
    super('rate_limit', 'Too many requests', 429);
    this.name = 'RateLimitError';
  }
}

export class ProcessorError extends LoopError {
  processorCode?: string;

  constructor(message: string, processorCode?: string) {
    super('processor_error', message, 400);
    this.name = 'ProcessorError';
    this.processorCode = processorCode;
  }
}

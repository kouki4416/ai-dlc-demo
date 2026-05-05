import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, Public } from '../public.decorator';

describe('@Public decorator', () => {
  it('attaches IS_PUBLIC_KEY metadata = true to the target method', () => {
    class TestController {
      @Public()
      handler(): void {}
    }
    const reflector = new Reflector();
    const value = reflector.get(IS_PUBLIC_KEY, TestController.prototype.handler);
    expect(value).toBe(true);
  });

  it('does not attach metadata when not used', () => {
    class TestController {
      handler(): void {}
    }
    const reflector = new Reflector();
    const value = reflector.get(IS_PUBLIC_KEY, TestController.prototype.handler);
    expect(value).toBeUndefined();
  });
});

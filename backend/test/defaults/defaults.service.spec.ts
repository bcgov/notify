import { Test, TestingModule } from '@nestjs/testing';
import { DefaultsService } from '../../src/defaults/defaults.service';
import { InMemoryDefaultsStore } from '../../src/defaults/stores/in-memory-defaults.store';

describe('DefaultsService', () => {
  let service: DefaultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DefaultsService, InMemoryDefaultsStore],
    }).compile();

    service = module.get(DefaultsService);
  });

  it('getDefaults returns empty object when no defaults set', () => {
    const result = service.getDefaults();
    expect(result).toEqual({});
  });

  it('updateDefaults merges and returns updated defaults', () => {
    const result = service.updateDefaults({
      emailAdapter: 'nodemailer',
      emailIdentityId: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.emailAdapter).toBe('nodemailer');
    expect(result.emailIdentityId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.updatedAt).toBeDefined();
  });

  it('updateDefaults persists across getDefaults', () => {
    service.updateDefaults({ renderer: 'handlebars' });

    const result = service.getDefaults();
    expect(result.renderer).toBe('handlebars');
  });

  it('updateDefaults merges partial updates', () => {
    service.updateDefaults({ emailAdapter: 'nodemailer', renderer: 'jinja2' });
    const result = service.updateDefaults({ renderer: 'handlebars' });

    expect(result.emailAdapter).toBe('nodemailer');
    expect(result.renderer).toBe('handlebars');
  });
});

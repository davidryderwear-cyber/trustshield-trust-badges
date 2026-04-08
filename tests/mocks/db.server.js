const mockPrisma = {
  badgeConfig: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
  },
  customBadge: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};

export default mockPrisma;

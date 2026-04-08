export const authenticate = {
  admin: vi.fn().mockResolvedValue({
    session: { shop: "test-shop.myshopify.com" },
    admin: {
      graphql: vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            data: {
              shop: { id: "gid://shopify/Shop/1" },
              metafieldsSet: {
                metafields: [{ id: "gid://shopify/Metafield/1" }],
                userErrors: [],
              },
            },
          }),
      }),
    },
  }),
};

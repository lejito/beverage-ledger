/** A page in the shape every paginated API list answers with. */
export function page<T>(data: T[], pageSize = 25) {
  return {
    data,
    meta: { page: 1, pageSize, total: data.length, pageCount: 1, count: data.length },
  };
}

export const PRODUCT = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Ron de prueba 7 años',
  category: { id: '44444444-4444-4444-8444-444444444444', name: 'Ron' },
  brand: { id: '55555555-5555-4555-8555-555555555555', name: 'Marca de prueba' },
  subcategory: null,
  abv: 40,
  origin: 'Cuba',
  age: '7 años',
  caseSize: 12,
  minimumStock: 6,
  isActive: true,
};

export const MEMBER = {
  id: '66666666-6666-4666-8666-666666666666',
  email: 'oscar@beverageledger.test',
  name: 'Óscar Operador',
  avatarUrl: null,
  role: 'OPERATOR',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: '2026-01-15T12:00:00.000Z',
};

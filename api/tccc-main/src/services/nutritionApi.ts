
export interface FoodProduct {
  code: string;
  name: string;
  brand: string;
  caloriesPer100g: number | null;
  imageUrl: string | null;
}

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  nutriments?: {
    'energy-kcal_100g'?: number | string;
  };
};

type OpenFoodFactsResponse = {
  products?: OpenFoodFactsProduct[];
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchFoods(
  query: string
): Promise<FoodProduct[]> {
  const term = query.trim();

  if (term.length < 2) {
    return [];
  }

  const url = new URL(
    'https://world.openfoodfacts.org/cgi/search.pl'
  );

  url.searchParams.set('search_terms', term);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '10');
  url.searchParams.set(
    'fields',
    'code,product_name,brands,nutriments,image_url'
  );

  let response: Response | null = null;

  // Faz até duas tentativas, com intervalo em caso de HTTP 503.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'LifeOrganicFit/1.0',
        },
      });

      if (response.status !== 503) {
        break;
      }

      if (attempt === 0) {
        console.warn(
          'Open Food Facts indisponível. Tentando novamente...'
        );
        await wait(10000);
      }
    } catch (error) {
      console.error('Erro de conexão:', error);

      throw new Error(
        'Não foi possível conectar à Open Food Facts. Verifique sua internet.'
      );
    }
  }

  if (!response) {
    throw new Error('Não foi possível obter resposta da API.');
  }

  if (response.status === 503) {
    throw new Error(
      'A Open Food Facts está temporariamente indisponível ou limitou as consultas. Aguarde aproximadamente 1 minuto e tente novamente.'
    );
  }

  if (!response.ok) {
    throw new Error(
      `Erro na Open Food Facts (HTTP ${response.status}).`
    );
  }

  let data: OpenFoodFactsResponse;

  try {
    data = await response.json();
  } catch {
    throw new Error('A API retornou uma resposta inválida.');
  }

  return (data.products ?? [])
    .filter((product) => product.product_name?.trim())
    .map((product) => {
      const rawEnergy =
        product.nutriments?.['energy-kcal_100g'];

      const energy =
        rawEnergy == null ? null : Number(rawEnergy);

      return {
        code: product.code ?? '',
        name: product.product_name ?? '',
        brand: product.brands ?? '',
        caloriesPer100g:
          energy !== null && Number.isFinite(energy)
            ? energy
            : null,
        imageUrl: product.image_url ?? null,
      };
    });
}

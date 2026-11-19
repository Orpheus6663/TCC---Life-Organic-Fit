import { Platform } from 'react-native';

export type FoodProduct = {
  code: string;
  name: string;
  brand: string;
  caloriesPer100g: number | null;
};

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  generic_name_pt?: string;
  lang?: string;
  lc?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number | string;
    'energy-kj_100g'?: number | string;
  };
};

type OpenFoodFactsResponse = {
  products?: OpenFoodFactsProduct[];
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pesquisa produtos e calorias por 100 g na API pública Open Food Facts. */
export async function searchFoods(query: string): Promise<FoodProduct[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', term);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('lc', 'pt');
  url.searchParams.set('tags_lc', 'pt');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '10');
  // O nome principal do cadastro pode estar em inglês. Pedimos os campos
  // localizados e usamos o nome original somente quando o cadastro é PT.
  url.searchParams.set('fields', 'code,product_name,product_name_pt,generic_name_pt,lang,lc,brands,nutriments');

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        ...(Platform.OS !== 'web' ? { 'User-Agent': 'LifeOrganicFit/1.0' } : {}),
      },
    });
  } catch {
    throw new Error('Não foi possível conectar à Open Food Facts. Confira sua internet e tente novamente.');
  }

  if (response.status === 503) {
    await wait(10_000);
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          ...(Platform.OS !== 'web' ? { 'User-Agent': 'LifeOrganicFit/1.0' } : {}),
        },
      });
    } catch {
      throw new Error('Não foi possível conectar à Open Food Facts. Confira sua internet e tente novamente.');
    }
  }
  if (response.status === 503) {
    throw new Error('A Open Food Facts está temporariamente indisponível ou atingiu o limite de consultas. Aguarde cerca de 1 minuto antes de pesquisar novamente.');
  }
  if (!response.ok) {
    throw new Error(`A busca de alimentos respondeu com erro HTTP ${response.status}. Tente novamente mais tarde.`);
  }

  let data: OpenFoodFactsResponse;
  try {
    data = await response.json() as OpenFoodFactsResponse;
  } catch {
    throw new Error('A busca de alimentos retornou uma resposta inválida.');
  }

  return (data.products ?? [])
    .map((product) => {
      const mainLanguage = (product.lang ?? product.lc ?? '').toLowerCase();
      const portugueseName = product.product_name_pt?.trim()
        || product.generic_name_pt?.trim()
        || (mainLanguage.startsWith('pt') ? product.product_name?.trim() : '');
      const rawCalories = product.nutriments?.['energy-kcal_100g'];
      const rawKilojoules = product.nutriments?.['energy-kj_100g'];
      const calories = rawCalories != null
        ? Number(rawCalories)
        : rawKilojoules != null
          ? Number(rawKilojoules) / 4.184
          : null;
      return {
        code: product.code ?? '',
        name: portugueseName,
        brand: product.brands?.trim() ?? '',
        caloriesPer100g: calories !== null && Number.isFinite(calories) ? Math.round(calories) : null,
      };
    })
    .filter((product) => product.name && product.caloriesPer100g !== null);
}

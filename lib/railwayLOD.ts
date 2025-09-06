// 鉄道駅LOD SPARQLエンドポイントとの連携クライアント
// 参考: https://qiita.com/uedayou/items/3ba823c5d3bede12af9c

export interface StationLOD {
  uri: string;
  name: string;
  lat?: number;
  lng?: number;
  lineColor?: string;
  railway?: string;
  company?: string;
  address?: string;
  description?: string;
  homepage?: string;
  transferStations?: string[];
}

export interface RailwayLOD {
  uri: string;
  name: string;
  color?: string;
  distance?: number;
  company?: string;
  description?: string;
  stations?: string[];
}

export interface RailwayGeometryLOD {
  uri: string;
  name: string;
  color?: string;
  wkt?: string;
}

/**
 * WKT (LINESTRING / MULTILINESTRING) を deck.gl PathLayer で使える座標列に変換
 * 返り値: パスの配列（MULTIの場合は複数）。各パスは [lng, lat][] の配列
 */
export function parseWktToPaths(wkt?: string): [number, number][][] {
  if (!wkt) return [];
  const text = wkt.trim();
  if (text.toUpperCase().startsWith('LINESTRING')) {
    const coords = text
      .replace(/^LINESTRING\s*\(/i, '')
      .replace(/\)$/, '')
      .split(',')
      .map((pair) => pair.trim().split(/[\s]+/).map((v) => parseFloat(v)) as [number, number])
      .filter((pt) => !pt.some((v) => Number.isNaN(v)));
    return [coords];
  }

  if (text.toUpperCase().startsWith('MULTILINESTRING')) {
    const inner = text.replace(/^MULTILINESTRING\s*\(\(/i, '').replace(/\)\)$/, '');
    const parts = inner.split('),(');
    const paths: [number, number][][] = parts.map((part) => {
      const coords = part
        .split(',')
        .map((pair) => pair.trim().split(/[\s]+/).map((v) => parseFloat(v)) as [number, number])
        .filter((pt) => !pt.some((v) => Number.isNaN(v)));
      return coords;
    });
    return paths;
  }

  return [];
}

export interface CompanyLOD {
  uri: string;
  name: string;
  description?: string;
  homepage?: string;
  railways?: string[];
  twitter?: string;
  youtube?: string;
}

/**
 * SPARQLクエリを実行する
 */
async function executeSPARQLQuery(query: string): Promise<any> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const endpoint = (
      typeof window === 'undefined'
        ? process.env.SPARQL_ENDPOINT
        : process.env.NEXT_PUBLIC_SPARQL_ENDPOINT
    ) || 'https://uedayou.net/sparql';

    const url = `${endpoint}?format=json&query=${encodedQuery}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('SPARQL query error:', error);
    throw error;
  }
}

/**
 * 駅データを検索する
 */
export async function searchStations(searchTerm?: string, limit: number = 100): Promise<StationLOD[]> {
  const filterClause = searchTerm ? 
    `filter( regex( ?label, '${searchTerm}', 'i' ) )` : '';

  const query = `
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
    prefix wdt: <http://www.wikidata.org/prop/direct/>
    prefix dbpediaowl: <http://dbpedia.org/ontology/>
    prefix propja: <http://ja.dbpedia.org/property/>
    prefix schema: <http://schema.org/>
    prefix foaf: <http://xmlns.com/foaf/0.1/>

    select distinct ?uri ?label ?lat ?lng ?lineColor ?railway ?company ?address ?description ?homepage where {
      ?uri a <https://uedayou.net/jrslod/Class/駅> ;
           rdfs:label ?label .
      
      optional { ?uri geo:lat ?lat }
      optional { ?uri geo:long ?lng }
      optional { ?uri wdt:P465 ?lineColor }
      optional { ?uri propja:所属路線 ?railway }
      optional { ?uri dbpediaowl:operatedBy ?company }
      optional { ?uri dbpediaowl:address ?address }
      optional { ?uri schema:description ?description }
      optional { ?uri foaf:homepage ?homepage }
      
      ${filterClause}
    }
    limit ${limit}
  `;

  try {
    const data = await executeSPARQLQuery(query);
    return parseStationResults(data);
  } catch (error) {
    console.error('Failed to search stations:', error);
    return [];
  }
}

/**
 * 特定の鉄道会社の駅を取得する
 */
export async function getStationsByCompany(companyName: string): Promise<StationLOD[]> {
  const query = `
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
    prefix wdt: <http://www.wikidata.org/prop/direct/>
    prefix dbpediaowl: <http://dbpedia.org/ontology/>
    prefix propja: <http://ja.dbpedia.org/property/>

    select distinct ?uri ?label ?lat ?lng ?lineColor ?railway ?company where {
      ?uri a <https://uedayou.net/jrslod/Class/駅> ;
           rdfs:label ?label ;
           dbpediaowl:operatedBy ?company .
      
      optional { ?uri geo:lat ?lat }
      optional { ?uri geo:long ?lng }
      optional { ?uri wdt:P465 ?lineColor }
      optional { ?uri propja:所属路線 ?railway }
      
      filter( regex( ?company, '${companyName}', 'i' ) )
    }
    limit 500
  `;

  try {
    const data = await executeSPARQLQuery(query);
    return parseStationResults(data);
  } catch (error) {
    console.error(`Failed to get stations for company ${companyName}:`, error);
    return [];
  }
}

/**
 * 路線データを取得する
 */
export async function getRailways(companyName?: string): Promise<RailwayLOD[]> {
  const companyFilter = companyName ? 
    `filter( regex( ?company, '${companyName}', 'i' ) )` : '';

  const query = `
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix wdt: <http://www.wikidata.org/prop/direct/>
    prefix dbpediaowl: <http://dbpedia.org/ontology/>
    prefix schema: <http://schema.org/>

    select distinct ?uri ?label ?color ?distance ?company ?description where {
      ?uri a <https://uedayou.net/jrslod/Class/路線> ;
           rdfs:label ?label .
      
      optional { ?uri wdt:P465 ?color }
      optional { ?uri wdt:P2043 ?distance }
      optional { ?uri dbpediaowl:operatedBy ?company }
      optional { ?uri schema:description ?description }
      
      ${companyFilter}
    }
    limit 200
  `;

  try {
    const data = await executeSPARQLQuery(query);
    return parseRailwayResults(data);
  } catch (error) {
    console.error('Failed to get railways:', error);
    return [];
  }
}

/**
 * 路線のWKTジオメトリを取得する
 */
export async function getRailwayGeometries(companyName?: string): Promise<RailwayGeometryLOD[]> {
  const companyFilter = companyName ? `filter( regex( ?company, '${companyName}', 'i' ) )` : '';

  const query = `
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix wdt: <http://www.wikidata.org/prop/direct/>
    prefix dbpediaowl: <http://dbpedia.org/ontology/>
    prefix geo: <http://www.opengis.net/ont/geosparql#>

    select distinct ?uri ?label ?color ?company ?wkt where {
      ?uri a <https://uedayou.net/jrslod/Class/路線> ;
           rdfs:label ?label .

      optional { ?uri wdt:P465 ?color }
      optional { ?uri dbpediaowl:operatedBy ?company }

      # ジオメトリは hasGeometry/asWKT の連鎖、および直接 asWKT が付く場合の両方を網羅
      optional {
        { ?uri geo:hasGeometry/geo:asWKT ?wkt }
        union { ?uri geo:asWKT ?wkt }
      }

      ${companyFilter}
    }
    limit 2000
  `;

  try {
    const data = await executeSPARQLQuery(query);
    return parseRailwayGeometryResults(data);
  } catch (error) {
    console.error('Failed to get railway geometries:', error);
    return [];
  }
}

/**
 * 鉄道会社データを取得する
 */
export async function getCompanies(): Promise<CompanyLOD[]> {
  const query = `
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix schema: <http://schema.org/>
    prefix foaf: <http://xmlns.com/foaf/0.1/>
    prefix wdt: <http://www.wikidata.org/prop/direct/>

    select distinct ?uri ?label ?description ?homepage ?twitter ?youtube where {
      ?uri a <https://uedayou.net/jrslod/Class/鉄道会社> ;
           rdfs:label ?label .
      
      optional { ?uri schema:description ?description }
      optional { ?uri foaf:homepage ?homepage }
      optional { ?uri wdt:P2002 ?twitter }
      optional { ?uri wdt:P2397 ?youtube }
    }
    limit 100
  `;

  try {
    const data = await executeSPARQLQuery(query);
    return parseCompanyResults(data);
  } catch (error) {
    console.error('Failed to get companies:', error);
    return [];
  }
}

/**
 * 特定駅の乗り換え可能駅を取得する
 */
export async function getTransferStations(stationUri: string): Promise<StationLOD[]> {
  const query = `
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix wdt: <http://www.wikidata.org/prop/direct/>
    prefix geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>

    select distinct ?transferUri ?label ?lat ?lng where {
      <${stationUri}> wdt:P833 ?transferUri .
      ?transferUri rdfs:label ?label .
      
      optional { ?transferUri geo:lat ?lat }
      optional { ?transferUri geo:long ?lng }
    }
  `;

  try {
    const data = await executeSPARQLQuery(query);
    return parseStationResults(data);
  } catch (error) {
    console.error('Failed to get transfer stations:', error);
    return [];
  }
}

/**
 * 路線内の駅を順序付きで取得する
 */
export async function getStationsInRailway(railwayUri: string): Promise<StationLOD[]> {
  const query = `
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix wdt: <http://www.wikidata.org/prop/direct/>
    prefix dcterms: <http://purl.org/dc/terms/>
    prefix geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>

    select distinct ?stationUri ?label ?lat ?lng where {
      <${railwayUri}> wdt:P527 ?stationUri .
      ?stationUri rdfs:label ?label .
      
      optional { ?stationUri geo:lat ?lat }
      optional { ?stationUri geo:long ?lng }
    }
    order by ?label
  `;

  try {
    const data = await executeSPARQLQuery(query);
    return parseStationResults(data);
  } catch (error) {
    console.error('Failed to get stations in railway:', error);
    return [];
  }
}

/**
 * JR各社のデータを一括取得する
 */
export async function getAllJRData(): Promise<{
  stations: StationLOD[];
  railways: RailwayLOD[];
  companies: CompanyLOD[];
}> {
  try {
    const [jrEastStations, jrWestStations, jrCentralStations, jrKyushuStations, jrShikokuStations, jrHokkaidoStations] = await Promise.all([
      getStationsByCompany('東日本旅客鉄道'),
      getStationsByCompany('西日本旅客鉄道'),
      getStationsByCompany('東海旅客鉄道'),
      getStationsByCompany('九州旅客鉄道'),
      getStationsByCompany('四国旅客鉄道'),
      getStationsByCompany('北海道旅客鉄道')
    ]);

    const stations = [
      ...jrEastStations,
      ...jrWestStations,
      ...jrCentralStations,
      ...jrKyushuStations,
      ...jrShikokuStations,
      ...jrHokkaidoStations
    ];

    const [railways, companies] = await Promise.all([
      getRailways('旅客鉄道'),
      getCompanies()
    ]);

    return {
      stations,
      railways,
      companies
    };
  } catch (error) {
    console.error('Failed to get all JR data:', error);
    return {
      stations: [],
      railways: [],
      companies: []
    };
  }
}

// パーサー関数群
function parseStationResults(data: any): StationLOD[] {
  if (!data?.results?.bindings) return [];

  return data.results.bindings.map((binding: any) => ({
    uri: binding.uri?.value || '',
    name: binding.label?.value || '',
    lat: binding.lat?.value ? parseFloat(binding.lat.value) : undefined,
    lng: binding.lng?.value ? parseFloat(binding.lng.value) : undefined,
    lineColor: binding.lineColor?.value,
    railway: binding.railway?.value,
    company: binding.company?.value,
    address: binding.address?.value,
    description: binding.description?.value,
    homepage: binding.homepage?.value
  }));
}

function parseRailwayResults(data: any): RailwayLOD[] {
  if (!data?.results?.bindings) return [];

  return data.results.bindings.map((binding: any) => ({
    uri: binding.uri?.value || '',
    name: binding.label?.value || '',
    color: binding.color?.value,
    distance: binding.distance?.value ? parseFloat(binding.distance.value) : undefined,
    company: binding.company?.value,
    description: binding.description?.value
  }));
}

function parseRailwayGeometryResults(data: any): RailwayGeometryLOD[] {
  if (!data?.results?.bindings) return [];

  return data.results.bindings.map((binding: any) => ({
    uri: binding.uri?.value || '',
    name: binding.label?.value || '',
    color: binding.color?.value,
    wkt: binding.wkt?.value
  }));
}

function parseCompanyResults(data: any): CompanyLOD[] {
  if (!data?.results?.bindings) return [];

  return data.results.bindings.map((binding: any) => ({
    uri: binding.uri?.value || '',
    name: binding.label?.value || '',
    description: binding.description?.value,
    homepage: binding.homepage?.value,
    twitter: binding.twitter?.value,
    youtube: binding.youtube?.value
  }));
}

/**
 * データのキャッシュ機能
 */
export class RailwayDataCache {
  private static instance: RailwayDataCache;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分

  static getInstance(): RailwayDataCache {
    if (!RailwayDataCache.instance) {
      RailwayDataCache.instance = new RailwayDataCache();
    }
    return RailwayDataCache.instance;
  }

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  clear(): void {
    this.cache.clear();
  }
}

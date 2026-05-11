/**
 * fixedPlaces.ts
 *
 * Hardcoded tourist places displayed as AR overlays.
 * Replace/extend these entries with your actual locations, coordinates, and descriptions.
 */

export interface FixedPlace {
  id: string;
  name: string;
  shortDescription: string;
  details: string;
  category: string;
  /** Emoji icon representing the category. */
  categoryIcon: string;
  /** WGS84 latitude in decimal degrees. */
  latitude: number;
  /** WGS84 longitude in decimal degrees. */
  longitude: number;
  /** Altitude above sea level in metres — improves vertical AR accuracy. */
  altitude: number;
}

export const FIXED_PLACES: FixedPlace[] = [
  {
    id: 'place-001',
    name: 'Sigiriya Rock Fortress',
    shortDescription: 'Ancient rock fortress and UNESCO World Heritage Site.',
    details:
      'Sigiriya (Lion Rock) is a 5th-century fortress built atop a 200 m column of rock by King Kashyapa. It features remarkable frescoes, mirror-wall inscriptions, and extensive water gardens — one of the best-preserved examples of ancient urban planning in Asia.',
    category: 'Heritage',
    categoryIcon: '🏛',
    latitude: 7.9574,
    longitude: 80.7603,
    altitude: 200,
  },
  {
    id: 'place-002',
    name: 'Temple of the Tooth',
    shortDescription:
      'Sacred Buddhist temple housing the relic of the tooth of the Buddha.',
    details:
      "Sri Dalada Maligawa in Kandy is one of Buddhism's most venerated shrines. The Buddha's tooth relic was brought to Sri Lanka in the 4th century CE. The temple hosts the Esala Perahera — a grand torch-lit procession held annually in July/August.",
    category: 'Temple',
    categoryIcon: '⛩',
    latitude: 7.2936,
    longitude: 80.6414,
    altitude: 486,
  },
  {
    id: 'place-003',
    name: 'Galle Fort',
    shortDescription:
      '17th-century Dutch colonial fort and UNESCO World Heritage Site.',
    details:
      'Galle Fort was first built in 1588 by the Portuguese and extensively fortified by the Dutch in the 17th century. The 1.4 km fort walls enclose a living township with colonial-era churches, mosques, boutique shops, and cafes. Listed as a UNESCO World Heritage Site in 1988.',
    category: 'Heritage',
    categoryIcon: '🏰',
    latitude: 6.0297,
    longitude: 80.2169,
    altitude: 10,
  },
  {
    id: 'place-004',
    name: 'National Museum Colombo',
    shortDescription: "Sri Lanka's largest museum with over 100,000 artifacts.",
    details:
      'Founded in 1877 by Governor Sir William Henry Gregory, the National Museum of Colombo houses the regalia of the last King of Kandy, traditional ritual masks, ancient stone inscriptions, and a natural history gallery. Located in Cinnamon Gardens, Colombo 7.',
    category: 'Museum',
    categoryIcon: '🎨',
    latitude: 6.9025,
    longitude: 79.8617,
    altitude: 7,
  },
  {
    id: 'place-005',
    name: 'Gangaramaya Temple',
    shortDescription:
      'Eclectic Buddhist temple blending Sri Lankan, Thai, and Chinese styles.',
    details:
      "Established in the late 19th century, Gangaramaya Temple is one of Colombo's most important Buddhist temples. It blends Sri Lankan, Thai, Indian, and Chinese architectural styles and houses a museum packed with antiques, ivory items, and rare religious artefacts.",
    category: 'Temple',
    categoryIcon: '⛩',
    latitude: 6.9175,
    longitude: 79.8567,
    altitude: 5,
  },
  {
    id: 'place-006',
    name: 'Lotus Tower',
    shortDescription:
      "South Asia's tallest tower at 350 m — an iconic Colombo landmark.",
    details:
      'The Colombo Lotus Tower stands 350 metres tall, making it the tallest self-supported structure in South Asia. Shaped like a lotus flower, it serves as a digital broadcast and telecoms tower with a sky observation deck at 173 m and a revolving restaurant.',
    category: 'Landmark',
    categoryIcon: '🗼',
    latitude: 6.9034,
    longitude: 79.8613,
    altitude: 350,
  },
  {
    id: 'place-007',
    name: 'Viharamahadevi Park',
    shortDescription: "Colombo's oldest and largest public park.",
    details:
      "Viharamahadevi Park (formerly Victoria Park) is Colombo's oldest and largest public park. It features a large golden seated Buddha statue, seasonal flower displays, an open-air theatre, and children's play areas. Named in honour of Queen Viharamahadevi, mother of King Dutugamunu.",
    category: 'Park',
    categoryIcon: '🌳',
    latitude: 6.9143,
    longitude: 79.8593,
    altitude: 7,
  },
  {
    id: 'place-008',
    name: 'Independence Square',
    shortDescription:
      'National monument commemorating Sri Lankan independence in 1948.',
    details:
      "Independence Commemoration Hall celebrates Sri Lanka's independence from Britain on 4 February 1948. The pavilion is modelled on the Audience Hall of the Kingdom of Kandy. A colonnade of lion statues lines the approach to the main hall.",
    category: 'Monument',
    categoryIcon: '🗿',
    latitude: 6.9013,
    longitude: 79.8663,
    altitude: 8,
  },
];

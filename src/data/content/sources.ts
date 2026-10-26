/** Scientific and technical sources cited in the app (SPEC.md, "Sources"). */
export interface Source {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly theme: 'programme' | 'nutrition' | 'technique' | 'health' | 'models' | 'order';
}

export const SOURCES: readonly Source[] = [
  {
    id: 'schoenfeld2016',
    label: 'Schoenfeld, Ogborn & Krieger, 2016 — fréquence et hypertrophie (Sports Medicine)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27102172/',
    theme: 'programme',
  },
  {
    id: 'schoenfeld2017',
    label:
      'Schoenfeld, Ogborn & Krieger, 2017 — volume et hypertrophie (Journal of Sports Sciences)',
    url: 'https://researchgate.net/profile/Brad-Schoenfeld/publication/305455324_Dose-response_relationship_between_weekly_resistance_training_volume_and_increases_in_muscle_mass_A_systematic_review_and_meta-analysis/links/59dc0269458515e9ab4527d6/Dose-response-relationship-between-weekly-resistance-training-volume-and-increases-in-muscle-mass-A-systematic-review-and-meta-analysis.pdf',
    theme: 'programme',
  },
  {
    id: 'sbs',
    label: 'Stronger By Science — synthèse sur le volume d’entraînement',
    url: 'https://www.strongerbyscience.com/?p=56687',
    theme: 'programme',
  },
  {
    id: 'haugen2023',
    label: 'Haugen et al., 2023 — machines ou poids libres',
    url: 'https://oda.oslomet.no/oda-xmlui/handle/11250/3107243',
    theme: 'programme',
  },
  {
    id: 'zhang2025',
    label: 'Zhang et al., 2025 — supersets et séries classiques (Sports Medicine)',
    url: 'https://eprints.leedsbeckett.ac.uk/id/eprint/11908',
    theme: 'programme',
  },
  {
    id: 'morton2018',
    label:
      'Morton et al., 2018 — protéines et gains musculaires (British Journal of Sports Medicine)',
    url: 'https://openrepository.aut.ac.nz/items/8dea98a4-4e37-4c60-be43-4b6ece0bd9a5/full',
    theme: 'nutrition',
  },
  {
    id: 'collagen',
    label: 'Revue systématique — collagène et protéines (PMC)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8521576/',
    theme: 'nutrition',
  },
  {
    id: 'barbend',
    label: 'BarBend — technique du développé couché',
    url: 'https://barbend.com/?p=54412',
    theme: 'technique',
  },
  {
    id: 'cressey',
    label: 'Eric Cressey — angle des coudes au développé couché',
    url: 'https://ericcressey.com/5-lose-fat-gain-muscle-get-strong-move-better-62/',
    theme: 'technique',
  },
  {
    id: 'bjsm2024',
    label: 'British Journal of Sports Medicine, 2024 — craquements du genou',
    url: 'https://bjsm.bmj.com/content/59/2/126',
    theme: 'health',
  },
  {
    id: 'acsm2009',
    label:
      'American College of Sports Medicine, 2009 — modèles de progression en musculation (Medicine & Science in Sports & Exercise)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19204579/',
    theme: 'order',
  },
  {
    id: 'simao2012',
    label: 'Simão et al., 2012 — l’ordre des exercices en musculation (Sports Medicine)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/22292516/',
    theme: 'order',
  },
  {
    id: 'nunes2021',
    label:
      'Nunes et al., 2021 — ordre des exercices, force et hypertrophie : méta-analyse (European Journal of Sport Science)',
    url: 'https://doi.org/10.1080/17461391.2020.1733672',
    theme: 'order',
  },
  {
    id: 'strengthlog',
    label: 'StrengthLog — comparatif des splits',
    url: 'https://www.strengthlog.com/best-workout-splits/',
    theme: 'models',
  },
  {
    id: 'phul',
    label: 'Power Lifting Technique — programme PHUL',
    url: 'https://powerliftingtechnique.com/phul-workout-program-power-hypertrophy-upper-lower/',
    theme: 'models',
  },
];

/** Exercise order in a session: the ready-made sessions follow these. */
export const ORDER_SOURCE_IDS = ['acsm2009', 'simao2012', 'nunes2021'] as const;

export function sourceById(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

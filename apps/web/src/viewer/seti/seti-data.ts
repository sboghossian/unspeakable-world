/**
 * "Are we alone?" — evidence-based catalog of candidate signals,
 * interstellar visitors, exoplanet biosignature claims, famous UAP
 * cases, and named answers to the Fermi paradox.
 *
 * Editorial policy: skeptical, scientifically honest. Where a prosaic
 * explanation exists, it leads. Sources are peer-reviewed papers, AARO
 * reports, NASA / SETI Institute material, or Mick West analyses — no
 * blogs or UFO advocacy sites.
 */

export type SignalStatus = "explained" | "unexplained" | "disputed";

export type SetiCandidate = {
  id: string;
  name: string;
  year: number;
  instrument: string;
  /** ICRS RA in degrees. `null` if no localized position. */
  raDeg: number | null;
  /** ICRS Dec in degrees. `null` if no localized position. */
  decDeg: number | null;
  status: SignalStatus;
  currentBestExplanation: string;
  link: string;
};

export const SETI_CANDIDATES: SetiCandidate[] = [
  {
    id: "wow-1977",
    name: "Wow! Signal",
    year: 1977,
    instrument: "Big Ear, Ohio State (1420 MHz)",
    raDeg: 290.6,
    decDeg: -27.0,
    status: "disputed",
    currentBestExplanation:
      "Never re-observed despite >100 follow-up searches. Paris (2017) proposed hydrogen cloud around comet 266P/Christensen; Garrett (2017) disputed this on bandwidth grounds. Origin remains unresolved; technosignature is one hypothesis of many.",
    link: "https://arxiv.org/abs/1706.04642",
  },
  {
    id: "blc1-2019",
    name: "BLC1 (Breakthrough Listen Candidate 1)",
    year: 2019,
    instrument: "Parkes 64-m, toward Proxima Centauri (982 MHz)",
    raDeg: 217.4,
    decDeg: -62.7,
    status: "explained",
    currentBestExplanation:
      "Sheikh et al. (2021, Nature Astronomy) showed the narrow-band drifting signal is consistent with an intermodulation product from Earth-based electronics: 26 similar look-alike signals were found in archival data, all RFI.",
    link: "https://www.nature.com/articles/s41550-021-01508-8",
  },
  {
    id: "kic-8462852",
    name: "Tabby's Star (KIC 8462852)",
    year: 2015,
    instrument: "Kepler photometry",
    raDeg: 301.564,
    decDeg: 44.457,
    status: "explained",
    currentBestExplanation:
      "Deep, irregular dimming (up to 22%). Wavelength-dependent dimming (Meng 2017) and wavelength analysis (Wright & Sigurdsson 2016; Boyajian 2018) favour an uneven dust/comet-debris swarm. Dyson-swarm hypothesis ruled out by IR limits.",
    link: "https://iopscience.iop.org/article/10.3847/2041-8213/aaa405",
  },
  {
    id: "hd164595-2015",
    name: "HD 164595 signal",
    year: 2015,
    instrument: "RATAN-600 (11 GHz)",
    raDeg: 270.65,
    decDeg: 29.05,
    status: "explained",
    currentBestExplanation:
      "Single 2-sec spike toward a Sun-like star. RATAN team itself later attributed it to terrestrial RFI / a likely military satellite downlink; never reproduced.",
    link: "https://www.seti.org/seti-institute/no-aliens-yet-no-signal-yet-allen-telescope-array-results-hd-164595",
  },
  {
    id: "lorimer-frb",
    name: "Lorimer Burst (FRB 010724)",
    year: 2007,
    instrument: "Parkes 64-m (archival 2001 data)",
    raDeg: 105.0,
    decDeg: -75.2,
    status: "explained",
    currentBestExplanation:
      "First fast radio burst discovered. Once exotic; the broader FRB population is now known to include magnetar flares (FRB 200428 from SGR 1935+2154, CHIME/STARE2 2020). Astrophysical, not technosignature.",
    link: "https://www.science.org/doi/10.1126/science.1147532",
  },
];

export type InterstellarVisitor = {
  id: string;
  name: string;
  year: number;
  perihelionDate: string;
  eccentricity: number;
  /** Heliocentric speed at infinity, km/s. */
  vInfinityKmS: number;
  peculiarity: string;
  link: string;
};

export const INTERSTELLAR_VISITORS: InterstellarVisitor[] = [
  {
    id: "oumuamua",
    name: "1I/'Oumuamua",
    year: 2017,
    perihelionDate: "2017-09-09",
    eccentricity: 1.2,
    vInfinityKmS: 26.3,
    peculiarity:
      "Extreme aspect ratio inferred from light-curve (≥6:1). Non-gravitational acceleration without visible coma. Bergner & Seligman (2023, Nature) showed entrained molecular H₂ outgassing from an irradiated water-ice body fits the data without exotic physics; alternative is a 'dark comet' with low-dust CO/CO₂ jets.",
    link: "https://www.nature.com/articles/s41586-022-05687-w",
  },
  {
    id: "borisov",
    name: "2I/Borisov",
    year: 2019,
    perihelionDate: "2019-12-08",
    eccentricity: 3.36,
    vInfinityKmS: 32.3,
    peculiarity:
      "First unambiguously cometary interstellar object. Coma chemistry showed an extreme CO/H₂O ratio (Bodewits 2020; Cordiner 2020) — likely formed beyond a CO snow line in another system.",
    link: "https://www.nature.com/articles/s41550-020-1095-2",
  },
  {
    id: "atlas-3i",
    name: "3I/ATLAS (C/2024 candidate)",
    year: 2024,
    perihelionDate: "perihelion TBD",
    eccentricity: 1.0,
    vInfinityKmS: 0,
    peculiarity:
      "Reported as the third candidate interstellar object. Orbital fit and naming subject to confirmation; treat numbers as provisional pending MPC designation. Listed here for completeness.",
    link: "https://minorplanetcenter.net/",
  },
];

export type BiosignatureCandidate = {
  id: string;
  name: string;
  hostStarType: string;
  distanceLY: number;
  massEarth: number;
  /** Insolation in units of Earth's solar constant. */
  insolationFraction: number;
  biosignatureStatus: string;
  jwstStatus: string;
  link: string;
};

export const BIOSIGNATURE_CANDIDATES: BiosignatureCandidate[] = [
  {
    id: "k2-18b",
    name: "K2-18 b",
    hostStarType: "M2.5V",
    distanceLY: 124,
    massEarth: 8.92,
    insolationFraction: 1.0,
    biosignatureStatus:
      "Madhusudhan (2023, 2024) reported tentative DMS / DMDS features in JWST NIRISS+NIRSpec+MIRI transmission spectra. Glein (2024) and independent reanalyses argue the features are not statistically robust and the planet may be a mini-Neptune with a magma ocean rather than a Hycean world.",
    jwstStatus: "Observed (NIRISS / NIRSpec / MIRI) — disputed detections",
    link: "https://arxiv.org/abs/2309.05566",
  },
  {
    id: "trappist-1e",
    name: "TRAPPIST-1 e",
    hostStarType: "M8V",
    distanceLY: 40.7,
    massEarth: 0.692,
    insolationFraction: 0.66,
    biosignatureStatus:
      "Rocky, in the conservative HZ. No biosignatures detected. Repeated transits constrain but do not yet exclude an atmosphere.",
    jwstStatus: "Observed — no confirmed atmosphere; cycle 2 / 3 ongoing",
    link: "https://exoplanets.nasa.gov/resources/2326/trappist-1e/",
  },
  {
    id: "trappist-1f",
    name: "TRAPPIST-1 f",
    hostStarType: "M8V",
    distanceLY: 40.7,
    massEarth: 1.039,
    insolationFraction: 0.38,
    biosignatureStatus:
      "Rocky, near outer edge of HZ. No biosignatures detected. Stellar XUV history of TRAPPIST-1 likely stripped early atmospheres.",
    jwstStatus: "Scheduled / in queue",
    link: "https://exoplanets.nasa.gov/resources/2327/trappist-1f/",
  },
  {
    id: "proxima-b",
    name: "Proxima Centauri b",
    hostStarType: "M5.5V",
    distanceLY: 4.24,
    massEarth: 1.07,
    insolationFraction: 0.65,
    biosignatureStatus:
      "Closest exoplanet to the Sun. Tidally locked; host star produces frequent X-ray / UV superflares (Howard 2018; MacGregor 2021) likely catastrophic for surface life. Not yet directly imaged at biosignature wavelengths.",
    jwstStatus: "Not yet characterised — non-transiting; future ELT / HWO target",
    link: "https://www.nature.com/articles/nature19106",
  },
  {
    id: "lhs-1140b",
    name: "LHS 1140 b",
    hostStarType: "M4.5V",
    distanceLY: 48.8,
    massEarth: 5.6,
    insolationFraction: 0.43,
    biosignatureStatus:
      "Dense rocky / water-world; in the HZ of a quiet M dwarf. Cadieux (2024) JWST NIRISS transit consistent with a possible N₂-rich atmosphere or a water-ocean surface; no biosignatures yet.",
    jwstStatus: "Observed (NIRISS) — atmosphere search ongoing",
    link: "https://arxiv.org/abs/2406.15136",
  },
  {
    id: "toi-700d",
    name: "TOI-700 d",
    hostStarType: "M2V",
    distanceLY: 101.4,
    massEarth: 1.72,
    insolationFraction: 0.86,
    biosignatureStatus:
      "Earth-sized in the HZ of a relatively quiet M dwarf. No atmosphere detected yet; transit depth makes JWST characterisation marginal.",
    jwstStatus: "Marginal target — not yet detected in atmosphere",
    link: "https://iopscience.iop.org/article/10.3847/2041-8213/ab5f07",
  },
];

export type UapCase = {
  id: string;
  name: string;
  year: number;
  location: string;
  originalClaim: string;
  officialExplanation: string;
  status: SignalStatus;
  link: string;
};

export const UAP_CASES: UapCase[] = [
  {
    id: "roswell-1947",
    name: "Roswell incident",
    year: 1947,
    location: "Roswell, New Mexico, USA",
    originalClaim:
      "Local press release referred to a 'flying disc' recovered by the Army Air Force; later civilian retellings (from the late 1970s onward) added crashed-craft and alien-body claims.",
    officialExplanation:
      "Air Force investigation (1994/1997 reports) identified the debris as a classified Project Mogul high-altitude balloon train carrying acoustic sensors to detect Soviet nuclear tests. Later 'alien body' accounts match anthropomorphic crash-test dummies dropped in unrelated programmes.",
    status: "explained",
    link: "https://www.af.mil/Portals/1/documents/foia/The_Roswell_Report.pdf",
  },
  {
    id: "phoenix-lights-1997",
    name: "Phoenix Lights",
    year: 1997,
    location: "Phoenix, Arizona, USA",
    originalClaim:
      "Two distinct events on 13 March 1997: a silent V-shaped formation moving south across Arizona, and a stationary arc of lights over Phoenix later the same evening.",
    officialExplanation:
      "The later stationary arc was confirmed as LUU-2B/B illumination flares dropped by Maryland Air National Guard A-10s during a Barry M. Goldwater Range training mission. The earlier formation is consistent with a flight of high-altitude aircraft (most analyses point to a squadron of five Janet 737s / A-10s in trail).",
    status: "explained",
    link: "https://skepticalinquirer.org/2017/03/the-phoenix-lights-explained-again/",
  },
  {
    id: "nimitz-2004",
    name: "USS Nimitz 'Tic-Tac'",
    year: 2004,
    location: "Off Baja California, Pacific Ocean",
    originalClaim:
      "F/A-18F crews from VFA-41 reported a smooth, white, ~12 m oblong object with no wings or exhaust performing high-acceleration manoeuvres; corroborating radar tracks from USS Princeton and FLIR1 ATFLIR video.",
    officialExplanation:
      "DoD AARO 'Historical Record Report Volume I' (Feb 2024) reviewed Nimitz: incident is documented but AARO has not concluded the object's identity. No physical evidence; sensor artefacts and atmospheric effects remain on the table. Not confirmed and not refuted as extraterrestrial.",
    status: "unexplained",
    link: "https://media.defense.gov/2024/Mar/08/2003409233/-1/-1/0/DOPSR-CLEARED-508-COMPLIANT-HRRV1-08-MAR-2024-FINAL.PDF",
  },
  {
    id: "gimbal-2015",
    name: "Navy 'Gimbal' video",
    year: 2015,
    location: "East Coast US training range",
    originalClaim:
      "ATFLIR video of a saucer-shaped object that appears to rotate in mid-air against the wind, accompanied by pilot exclamations of 'a whole fleet of them'.",
    officialExplanation:
      "Detailed optical analysis (Mick West, 2019-2020) shows the apparent rotation is an artefact of the ATFLIR gimbal mechanism rolling to keep the sensor level as the aircraft banks; the 'object' is most consistent with the infrared glare of a distant jet's engines. Not paranormal.",
    status: "explained",
    link: "https://www.metabunk.org/threads/explained-gimbal-ufo-video-from-2015.10138/",
  },
  {
    id: "aguadilla-2013",
    name: "Aguadilla, Puerto Rico",
    year: 2013,
    location: "Rafael Hernández Airport, Aguadilla, Puerto Rico",
    originalClaim:
      "DHS thermal-imager footage from a CBP DHC-8 of a small warm object skimming low over terrain and water, briefly appearing to split in two.",
    officialExplanation:
      "Analysis by the Scientific Coalition for UAP Studies was challenged by independent reviewers (Mick West, 2018) who matched the trajectory, speed, and 'splitting' to a pair of Chinese sky-lanterns released from a nearby wedding venue; thermal signature, drift speed, and altitude all fit.",
    status: "explained",
    link: "https://www.metabunk.org/threads/explained-aguadilla-puerto-rico-ufo-its-chinese-lanterns.9434/",
  },
];

export type FermiAnswer = {
  id: string;
  name: string;
  proposer: string;
  twoSentenceSummary: string;
  link: string;
};

export const FERMI_PARADOX_ANSWERS: FermiAnswer[] = [
  {
    id: "rare-earth",
    name: "Rare Earth",
    proposer: "Ward & Brownlee (2000)",
    twoSentenceSummary:
      "Complex life requires a long, narrow conjunction of conditions — plate tectonics, a large stabilising moon, a Jupiter-class shepherd, a galactic-habitable-zone orbit, low impact rate, the right metallicity. Microbes may be common; animals are not.",
    link: "https://link.springer.com/book/10.1007/b97646",
  },
  {
    id: "great-filter-past",
    name: "Great Filter (behind us)",
    proposer: "Hanson (1998)",
    twoSentenceSummary:
      "Somewhere on the long road from abiogenesis to space-faring civilisation lies an enormous improbability. If that filter is in our past — e.g. the origin of life, or the eukaryotic transition — the silence is reassuring.",
    link: "https://mason.gmu.edu/~rhanson/greatfilter.html",
  },
  {
    id: "great-filter-future",
    name: "Great Filter (ahead of us)",
    proposer: "Hanson (1998)",
    twoSentenceSummary:
      "Same framework, opposite conclusion: if the filter lies ahead — self-destruction, ecological collapse, runaway tech — then every quiet star is a warning. Each apparently habitable world that turns out empty makes this reading worse, not better.",
    link: "https://mason.gmu.edu/~rhanson/greatfilter.html",
  },
  {
    id: "zoo-hypothesis",
    name: "Zoo hypothesis",
    proposer: "Ball (1973)",
    twoSentenceSummary:
      "Advanced civilisations exist but deliberately avoid contact, preserving Earth as a wilderness or controlled experiment. Untestable by construction, which is its main weakness.",
    link: "https://www.sciencedirect.com/science/article/abs/pii/0019103573901119",
  },
  {
    id: "dark-forest",
    name: "Dark Forest",
    proposer: "Liu Cixin (2008)",
    twoSentenceSummary:
      "Game-theoretic argument: any civilisation that broadcasts risks pre-emptive strike from any other, so silence is the rational stance. A literary thought-experiment rather than a constraint from physics.",
    link: "https://en.wikipedia.org/wiki/The_Dark_Forest",
  },
  {
    id: "transcension",
    name: "Transcension hypothesis",
    proposer: "Smart (2012)",
    twoSentenceSummary:
      "Mature civilisations converge inward toward extreme energy/matter/space/time density (black-hole-scale computation), not outward into interstellar colonisation. They become invisible because they shrink, not because they die.",
    link: "https://www.sciencedirect.com/science/article/abs/pii/S0094576511003304",
  },
  {
    id: "berserker",
    name: "Berserker hypothesis",
    proposer: "Saberhagen (1967) / Brin (1983)",
    twoSentenceSummary:
      "Self-replicating predatory probes have already pruned the galaxy of detectable civilisations; we are alive only because we are not yet noisy enough. Bleak, untested, but a logically coherent prediction.",
    link: "https://articles.adsabs.harvard.edu/cgi-bin/nph-iarticle_query?1983QJRAS..24..283B",
  },
  {
    id: "aurora-effect",
    name: "Aurora effect",
    proposer: "After Kim Stanley Robinson; formalised by Schwartz & Townes-style work",
    twoSentenceSummary:
      "Interstellar colonisation is biologically self-defeating: arriving organisms cannot adapt to chemistry that did not evolve alongside them. Habitable does not mean habitable for us.",
    link: "https://en.wikipedia.org/wiki/Aurora_(novel)",
  },
  {
    id: "aestivation",
    name: "Aestivation hypothesis",
    proposer: "Sandberg, Armstrong & Cirković (2017)",
    twoSentenceSummary:
      "Computation gets exponentially cheaper as the cosmic background cools, so advanced civilisations sleep through the present hot era to compute vastly more later. We see nothing because no one is awake yet.",
    link: "https://arxiv.org/abs/1705.03394",
  },
];

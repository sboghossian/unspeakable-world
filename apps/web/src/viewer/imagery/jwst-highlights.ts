/**
 * Curated catalog of the most famous public JWST images.
 *
 * Each entry references a Space Telescope Science Institute (STScI)
 * press-release page on webbtelescope.org. The image URLs point at
 * `stsci-opo.org`, STScI's stable CDN for Outreach Public Outputs;
 * those URLs change rarely.
 *
 * `raDeg` / `decDeg` are J2000 sky coordinates so the panel can
 * deep-link into the sky-atlas viewer via `#viewer?ra=N&dec=N`.
 * Targets are drawn from NASA/STScI press materials.
 *
 * NOT exhaustive — this is a hand-picked highlight reel of the
 * imagery the public actually recognizes.
 */

export type JwstImage = {
  id: string;
  title: string;
  raDeg?: number;
  decDeg?: number;
  releaseDate: string;
  description: string;
  instrumentMode: string;
  imageUrl: string;
  thumbnailUrl?: string;
  pressReleaseUrl: string;
};

export const JWST_HIGHLIGHTS: JwstImage[] = [
  {
    id: "2022-035",
    title: "SMACS 0723 — First Deep Field",
    raDeg: 110.8375,
    decDeg: -73.4549,
    releaseDate: "2022-07-11",
    description:
      "JWST's first deep field — a galaxy cluster 4.6 billion light-years away whose gravity lenses light from galaxies that existed less than a billion years after the Big Bang. The sharpest infrared image of the distant universe ever taken.",
    instrumentMode: "NIRCam composite",
    imageUrl:
      "https://stsci-opo.org/STScI-01G7DA5ADA2WDSK1JJPQ0PTG4A.png",
    thumbnailUrl:
      "https://stsci-opo.org/STScI-01G7DA5ADA2WDSK1JJPQ0PTG4A.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-035",
  },
  {
    id: "2022-031",
    title: "Cosmic Cliffs — Carina Nebula",
    raDeg: 159.225,
    decDeg: -58.65,
    releaseDate: "2022-07-12",
    description:
      "The 'Cosmic Cliffs' of NGC 3324 in the Carina Nebula — a star-forming wall sculpted by ultraviolet radiation from massive young stars. Roughly 7,600 light-years away.",
    instrumentMode: "NIRCam + MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01G77PKB8NKR7S8Z6HBXMYATGJ.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-031",
  },
  {
    id: "2022-034",
    title: "Stephan's Quintet",
    raDeg: 339.0142,
    decDeg: 33.9656,
    releaseDate: "2022-07-12",
    description:
      "Five galaxies (four interacting) in the constellation Pegasus — a textbook lab for galaxy collisions, shock fronts, and triggered star formation, captured in extraordinary detail.",
    instrumentMode: "NIRCam + MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01G7JJADTH7BBJ5VMHEZBE7CR3.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-034",
  },
  {
    id: "2022-033",
    title: "Southern Ring Nebula (NGC 3132)",
    raDeg: 151.7575,
    decDeg: -40.4358,
    releaseDate: "2022-07-12",
    description:
      "A planetary nebula 2,500 light-years away. Two cameras reveal the cool, dusty halo and the second, dimmer star whose ejected shells sculpted the rings.",
    instrumentMode: "NIRCam + MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01G79RBGSGJG54AAJ4VC6X376G.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-033",
  },
  {
    id: "2022-052",
    title: "Pillars of Creation",
    raDeg: 274.7,
    decDeg: -13.8067,
    releaseDate: "2022-10-19",
    description:
      "JWST's near-infrared view of the iconic pillars in the Eagle Nebula (M16) — three towers of cool gas and dust where new stars are forming. 6,500 light-years away.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01GF422GED6FDFCVNCAVKVT3FT.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-052",
  },
  {
    id: "2022-051",
    title: "Phantom Galaxy (M74)",
    raDeg: 24.1739,
    decDeg: 15.7836,
    releaseDate: "2022-08-29",
    description:
      "A 'grand design' face-on spiral about 32 million light-years away. JWST's mid-infrared eye traces filaments of warm dust along the arms with stunning clarity.",
    instrumentMode: "MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01G9G4J23CDPVNDH6S5HQ7BNV1.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-051",
  },
  {
    id: "2022-040",
    title: "Tarantula Nebula (30 Doradus)",
    raDeg: 84.6767,
    decDeg: -69.1011,
    releaseDate: "2022-09-06",
    description:
      "A turbulent stellar nursery in the Large Magellanic Cloud, 161,000 light-years away — the most active star-forming region in the Local Group.",
    instrumentMode: "NIRCam + MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01GA76Q01D09HFEV174SVMQDMV.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-040",
  },
  {
    id: "2023-116",
    title: "Rho Ophiuchi Cloud Complex",
    raDeg: 246.7875,
    decDeg: -24.5333,
    releaseDate: "2023-07-12",
    description:
      "JWST's first-anniversary image — the closest star-forming region to Earth, 390 light-years away. About 50 young stars carve cavities in molecular hydrogen.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01H4JN6KK6F3GH6CZ3KE2VAJYY.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-116",
  },
  {
    id: "2022-046",
    title: "Neptune & Rings",
    raDeg: 339.7842,
    decDeg: -7.2386,
    releaseDate: "2022-09-21",
    description:
      "Neptune as never before — JWST resolves the planet's faint dust rings, the bright cloud bands of methane ice, and seven of its 14 known moons in a single near-IR exposure.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01GAD2HBR07XP9FE1RKB3ZB9YE.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-046",
  },
  {
    id: "2023-117",
    title: "Saturn",
    raDeg: 318.6967,
    decDeg: -17.0917,
    releaseDate: "2023-06-25",
    description:
      "JWST's NIRCam view of Saturn — methane absorbs sunlight at these wavelengths, darkening the planet's disk and making the icy rings glow with eerie brilliance.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01H4JZF7J1QCFEDXCCY70S4Y3Y.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-117",
  },
  {
    id: "2022-053",
    title: "Cartwheel Galaxy",
    raDeg: 9.4221,
    decDeg: -33.7286,
    releaseDate: "2022-08-02",
    description:
      "A ring galaxy 500 million light-years away, the aftermath of a head-on collision with a smaller galaxy. JWST resolves the expanding wave of star formation.",
    instrumentMode: "NIRCam + MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01G8GZQ3ZFJRD8YHHCQAM3R0VG.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-053",
  },
  {
    id: "2023-105",
    title: "NGC 346",
    raDeg: 14.7708,
    decDeg: -72.1772,
    releaseDate: "2023-01-11",
    description:
      "A dazzling star-forming region in the Small Magellanic Cloud — a metal-poor environment that mimics conditions in the early universe. 200,000 light-years away.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01GMCDGYTW4NHHE3FBVVPQ8KW7.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-105",
  },
  {
    id: "2023-128",
    title: "NGC 1433",
    raDeg: 55.5067,
    decDeg: -47.2219,
    releaseDate: "2023-02-16",
    description:
      "A barred spiral galaxy 46 million light-years away, part of the PHANGS-JWST survey of nearby galactic anatomy. The double-ring structure is sharply resolved.",
    instrumentMode: "MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01GVFNT783FXBVN67JZW1J6XBQ.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-128",
  },
  {
    id: "2023-129",
    title: "NGC 7496",
    raDeg: 347.4467,
    decDeg: -43.4278,
    releaseDate: "2023-02-16",
    description:
      "Part of the PHANGS catalog — a face-on barred spiral 24 million light-years distant. JWST exposes the warm-dust filaments tracing molecular clouds along its arms.",
    instrumentMode: "MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01GVFNTKGJV1B6MMTZ9GS68FH5.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-129",
  },
  {
    id: "2024-105",
    title: "NGC 1365 — Great Barred Spiral",
    raDeg: 53.4017,
    decDeg: -36.1403,
    releaseDate: "2024-01-29",
    description:
      "A magnificent barred spiral in Fornax, 56 million light-years away. JWST reveals the bones of the bar — dust lanes, embedded star clusters, and a churning core.",
    instrumentMode: "MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01HKJ0WJBSP91DMC0TF63WA0PA.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2024/news-2024-105",
  },
  {
    id: "2022-039",
    title: "Jupiter",
    raDeg: 0,
    decDeg: 0,
    releaseDate: "2022-08-22",
    description:
      "Auroras at both poles, the Great Red Spot rendered white by infrared, and the planet's faint rings — JWST gives Jupiter the gas-giant glamour shot.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01G80HG72REVPVB5DDQTH2NS9V.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2022/news-2022-039",
  },
  {
    id: "2023-153",
    title: "Crab Nebula (M1)",
    raDeg: 83.6331,
    decDeg: 22.0145,
    releaseDate: "2023-10-30",
    description:
      "The shredded remnant of a supernova whose light reached Earth in 1054 CE. JWST traces the cage of dust filaments and the synchrotron glow from the pulsar wind nebula.",
    instrumentMode: "NIRCam + MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01HE2EFA1MD4XK0Z8M2GS73T2W.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-153",
  },
  {
    id: "2023-158",
    title: "Uranus & Rings",
    raDeg: 51.9217,
    decDeg: 18.1547,
    releaseDate: "2023-12-18",
    description:
      "The ice giant in unprecedented detail — eleven of its thirteen known rings, the bright polar cap, and a handful of inner moons all in a single near-infrared frame.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01HHN4Q5W3GTHJ5XK01ZK0X8YS.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-158",
  },
  {
    id: "2023-148",
    title: "NGC 7469",
    raDeg: 345.815,
    decDeg: 8.874,
    releaseDate: "2023-01-31",
    description:
      "A luminous infrared galaxy 220 million light-years away, hosting a starburst ring around an active supermassive black hole — a key target for understanding the AGN/star-formation link.",
    instrumentMode: "MIRI + NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01GR3CSAMQNYV2FF42WYK1ZBT3.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-148",
  },
  {
    id: "2023-144",
    title: "NGC 1672",
    raDeg: 71.4267,
    decDeg: -59.2475,
    releaseDate: "2023-06-05",
    description:
      "A barred spiral about 60 million light-years away in Dorado. JWST's MIRI resolves the gas-rich bar pumping material into a starburst nuclear ring.",
    instrumentMode: "MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01GZGHEFQXP4K6JBDHWZQNNBV1.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-144",
  },
  {
    id: "2024-128",
    title: "Penguin & Egg (Arp 142)",
    raDeg: 137.0438,
    decDeg: -19.5681,
    releaseDate: "2024-07-12",
    description:
      "JWST's second-anniversary image — the interacting galaxy pair NGC 2936 (the 'penguin') and NGC 2937 (the 'egg'), locked in a gravitational dance 326 million light-years away.",
    instrumentMode: "NIRCam + MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01J29WV2ZBKXAEYS8H08PSJ8RT.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2024/news-2024-128",
  },
  {
    id: "2024-110",
    title: "Serpens Nebula — Aligned Protostellar Outflows",
    raDeg: 277.4917,
    decDeg: 1.2,
    releaseDate: "2024-06-20",
    description:
      "JWST captured a population of young protostars whose bipolar jets are all aligned in the same direction — a snapshot of stellar birth at its most synchronized.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01J0VVT72GBT76VWZBC9C1V35E.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2024/news-2024-110",
  },
  {
    id: "2023-138",
    title: "Ring Nebula (M57)",
    raDeg: 283.3963,
    decDeg: 33.0292,
    releaseDate: "2023-08-21",
    description:
      "The classic planetary nebula in Lyra, 2,500 light-years away — concentric shells, intricate filaments, and a central white dwarf, all in unprecedented infrared detail.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01H7GZH4MAFSRYWP78GD81H2YK.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-138",
  },
  {
    id: "2023-114",
    title: "Herbig-Haro 211",
    raDeg: 56.0125,
    decDeg: 32.7333,
    releaseDate: "2023-09-14",
    description:
      "A bipolar jet from a class-0 protostar 1,000 light-years away in Perseus — JWST resolves shock-heated knots along the outflow with sub-arcsecond precision.",
    instrumentMode: "NIRCam",
    imageUrl:
      "https://stsci-opo.org/STScI-01HAFFV9A8X4DEZD8PSP1XHWZJ.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-114",
  },
  {
    id: "2023-149",
    title: "WR 124 — Wolf-Rayet Star",
    raDeg: 286.7733,
    decDeg: 16.875,
    releaseDate: "2023-03-14",
    description:
      "A rare phase of stellar life — a massive star casting off its outer layers in spectacular shells of gas and dust, 15,000 light-years away in Sagitta.",
    instrumentMode: "NIRCam + MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01GTYAR4WS4Q5R0VHCSE4VEPCQ.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2023/news-2023-149",
  },
  {
    id: "2024-119",
    title: "Horsehead Nebula",
    raDeg: 85.2475,
    decDeg: -2.4575,
    releaseDate: "2024-04-29",
    description:
      "The top of the iconic dark column in Orion — JWST's sharpest look ever at the photodissociation region where ultraviolet light from nearby stars sculpts the cloud's edge.",
    instrumentMode: "NIRCam + MIRI",
    imageUrl:
      "https://stsci-opo.org/STScI-01HVS2BHX36WPVXFRZGGZ58W8H.png",
    pressReleaseUrl:
      "https://webbtelescope.org/contents/news-releases/2024/news-2024-119",
  },
];

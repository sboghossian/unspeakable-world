/**
 * Glossary of astronomy / astrophysics terms used in the InfoPanel,
 * the search results, and the tour scripts. `short` is a one-sentence
 * tooltip; `long` is the optional couple-of-paragraph explainer that a
 * future "/glossary/{slug}" page can render. `relatedTerms` are
 * normalised keys (lowercase, no spaces) so the future page can build a
 * graph.
 *
 * Voice: explain like the reader is a curious 12-year-old who has never
 * heard the term. No equations.
 */

export type GlossaryTerm = {
  /** Display term. Casing is preserved from the table. */
  term: string;
  /** Tooltip-length definition. One sentence. */
  short: string;
  /** Optional longer explanation. */
  long?: string;
  /** Related glossary keys (lowercase, see normalise). */
  relatedTerms?: string[];
};

function entry(
  term: string,
  short: string,
  long?: string,
  relatedTerms?: string[],
): GlossaryTerm {
  const t: GlossaryTerm = { term, short };
  if (long) t.long = long;
  if (relatedTerms) t.relatedTerms = relatedTerms;
  return t;
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  "apparent magnitude": entry(
    "apparent magnitude",
    "How bright a star looks from Earth. Lower numbers are brighter; the Sun is −26.7, the dimmest naked-eye stars are about +6.",
    "Apparent magnitude is a logarithmic scale set up in antiquity (brightest stars were 'first magnitude'; faintest visible were 'sixth'). A 5-magnitude difference is a factor of 100 in brightness. Because it depends on distance, a star can look bright either because it is intrinsically luminous or because it is close.",
    ["absolute magnitude", "luminosity", "distance modulus"],
  ),
  "absolute magnitude": entry(
    "absolute magnitude",
    "How bright a star would look if it were placed exactly 10 parsecs (32.6 light-years) away — its true brightness, after removing the distance.",
    "Absolute magnitude lets us compare stars apples-to-apples. The Sun's absolute magnitude is +4.83 — at 10 parsecs it would look like a faint naked-eye star, not the blinding disk we see.",
    ["apparent magnitude", "luminosity", "parsec", "distance modulus"],
  ),
  parallax: entry(
    "parallax",
    "The tiny shift in a star's apparent position as Earth moves around the Sun — the basic way we measure distances to nearby stars.",
    "If you hold up a finger and close one eye, then the other, the finger appears to jump. Stars do the same against more distant background stars when Earth moves to the other side of its orbit (200 million km away). The closer the star, the bigger the jump. ESA's Gaia mission has measured parallaxes for nearly two billion stars.",
    ["parsec", "proper motion"],
  ),
  "proper motion": entry(
    "proper motion",
    "How fast a star moves across the sky in arcseconds per year, after subtracting Earth's motion.",
    "Proper motion is the projection of a star's velocity onto our sky. Fast-movers like Barnard's Star drift visibly within a decade; most stars are far enough away that you would need centuries to see any motion at all.",
    ["parallax", "parsec"],
  ),
  redshift: entry(
    "redshift",
    "The stretching of light to longer (redder) wavelengths because the source is moving away from us or because space itself has expanded.",
    "Two flavours exist. Doppler redshift comes from motion; cosmological redshift comes from the expansion of the universe between the time the photon was emitted and now. They are not the same physically, but a single number `z` describes both: a wavelength λ becomes λ(1+z).",
    ["blueshift", "hubble's law", "cmb"],
  ),
  blueshift: entry(
    "blueshift",
    "The compression of light to shorter (bluer) wavelengths because the source is moving toward us.",
    undefined,
    ["redshift"],
  ),
  "light-year": entry(
    "light-year",
    "The distance light travels in one year — about 9.46 trillion km, or 63,000 AU.",
    "A light-year is a distance, not a time. The nearest star, Proxima Centauri, is 4.246 light-years away. The Milky Way is roughly 100,000 light-years across.",
    ["parsec", "au"],
  ),
  parsec: entry(
    "parsec",
    "A distance unit equal to about 3.26 light-years (3.086 × 10¹³ km), used by professional astronomers.",
    "Defined as the distance at which one astronomical unit subtends one arcsecond of angle. Distances to most cataloged galaxies are quoted in megaparsecs (Mpc).",
    ["parallax", "light-year"],
  ),
  AU: entry(
    "AU",
    "Astronomical Unit — the mean Earth-Sun distance, 149,597,870 km. The natural ruler for the solar system.",
    "Mars is 1.52 AU from the Sun; Jupiter 5.2 AU; Neptune 30 AU. The light-travel time over 1 AU is 8 minutes 19 seconds.",
    ["light-year", "parsec"],
  ),
  ecliptic: entry(
    "ecliptic",
    "The plane of Earth's orbit around the Sun — the line the Sun, Moon, and planets appear to follow against the stars.",
    "The zodiacal constellations sit along the ecliptic. Eclipses happen only when the Moon crosses this plane near a New or Full Moon.",
    ["equatorial plane", "ra", "dec"],
  ),
  "equatorial plane": entry(
    "equatorial plane",
    "The imaginary plane projected outward from Earth's equator — the reference for right ascension and declination.",
    undefined,
    ["ecliptic", "ra", "dec"],
  ),
  "right ascension": entry(
    "right ascension",
    "The east-west coordinate on the sky, measured in hours from 0 to 24 — the celestial equivalent of longitude.",
    undefined,
    ["declination", "j2000", "equatorial plane"],
  ),
  declination: entry(
    "declination",
    "The north-south coordinate on the sky, measured in degrees from −90° (south pole) to +90° (north pole) — the celestial latitude.",
    undefined,
    ["right ascension", "j2000"],
  ),
  J2000: entry(
    "J2000",
    "The standard reference epoch for sky coordinates — noon Universal Time on 1 January 2000.",
    "Coordinates given as 'J2000' are defined relative to where the celestial equator was at that moment. Because Earth's axis slowly precesses, modern catalogs all quote J2000 positions so they can be compared without ambiguity.",
    ["right ascension", "declination"],
  ),
  perihelion: entry(
    "perihelion",
    "The point in an orbit closest to the Sun.",
    undefined,
    ["aphelion", "eccentricity"],
  ),
  aphelion: entry(
    "aphelion",
    "The point in an orbit farthest from the Sun.",
    undefined,
    ["perihelion", "eccentricity"],
  ),
  eccentricity: entry(
    "eccentricity",
    "How squashed an orbit is — 0 is a perfect circle, just under 1 is a long thin ellipse, and 1 or more means the object will escape.",
    undefined,
    ["perihelion", "aphelion"],
  ),
  libration: entry(
    "libration",
    "The slight rocking motion of the Moon that lets us see about 59% of its surface from Earth, not just the locked 50%.",
    undefined,
    ["tidal lock"],
  ),
  photosphere: entry(
    "photosphere",
    "The visible 'surface' of the Sun or a star — the layer where the gas finally becomes transparent enough for light to escape.",
    undefined,
    ["chromosphere", "corona"],
  ),
  chromosphere: entry(
    "chromosphere",
    "The thin pink layer of the Sun just above the photosphere, briefly visible as a red rim during a total solar eclipse.",
    undefined,
    ["photosphere", "corona"],
  ),
  corona: entry(
    "corona",
    "The Sun's outermost atmosphere — extraordinarily hot (over a million degrees) and visible only during a total eclipse or with special instruments.",
    undefined,
    ["photosphere", "chromosphere", "solar flare"],
  ),
  sunspot: entry(
    "sunspot",
    "A cooler, magnetically intense patch on the Sun's surface that looks dark only because it is less hot than its surroundings.",
    undefined,
    ["solar flare", "cme"],
  ),
  "solar flare": entry(
    "solar flare",
    "A sudden release of magnetic energy in the Sun's atmosphere — millions of times more powerful than a hydrogen bomb, and over in minutes.",
    undefined,
    ["cme", "sunspot", "corona"],
  ),
  CME: entry(
    "CME",
    "Coronal Mass Ejection — a billion-tonne cloud of magnetised plasma launched from the Sun, which can disrupt satellites and power grids when it hits Earth.",
    undefined,
    ["solar flare", "corona"],
  ),
  "accretion disk": entry(
    "accretion disk",
    "A flattened, hot disk of material spiralling onto a compact object like a black hole or neutron star — typically the brightest part of the system.",
    undefined,
    ["event horizon", "agn"],
  ),
  "event horizon": entry(
    "event horizon",
    "The boundary around a black hole inside which nothing — not even light — can escape.",
    "The event horizon is not a physical surface; it is a one-way membrane in spacetime. For a non-rotating black hole, its radius (the Schwarzschild radius) is set entirely by the mass: 3 km per solar mass.",
    ["photon sphere", "accretion disk", "gravitational lensing"],
  ),
  "photon sphere": entry(
    "photon sphere",
    "The thin shell around a black hole where light can orbit in unstable circles — at 1.5 times the event horizon radius for a non-rotating hole.",
    undefined,
    ["event horizon", "gravitational lensing"],
  ),
  "gravitational lensing": entry(
    "gravitational lensing",
    "The bending of light by a massive object's gravity — a prediction of general relativity confirmed in 1919 and used today to map dark matter and find distant galaxies.",
    undefined,
    ["dark matter", "event horizon"],
  ),
  "dark matter": entry(
    "dark matter",
    "Invisible mass — about five times more abundant than ordinary matter — whose gravity holds galaxies and clusters together.",
    "Galaxies rotate too fast for their visible mass; clusters bend light more than their visible mass should; the cosmic microwave background's structure requires it. What dark matter is made of is still unknown.",
    ["dark energy", "gravitational lensing", "cmb"],
  ),
  "dark energy": entry(
    "dark energy",
    "The unknown energy that is making the universe's expansion accelerate, accounting for roughly 70% of the cosmic energy budget.",
    "Discovered in 1998 from observations of distant Type Ia supernovae. Earning Perlmutter, Schmidt, and Riess the 2011 Nobel. Its physical nature remains a mystery.",
    ["dark matter", "redshift", "hubble's law"],
  ),
  CMB: entry(
    "CMB",
    "Cosmic Microwave Background — the relic glow of the hot, dense early universe, now stretched into faint microwaves that fill the sky.",
    "Discovered accidentally by Penzias and Wilson in 1965 (Nobel 1978). It has a perfect 2.725 K blackbody spectrum and tiny temperature fluctuations that map the seeds of every galaxy we see.",
    ["redshift", "hubble's law", "dark matter"],
  ),
  "Hubble's law": entry(
    "Hubble's law",
    "The relationship that more distant galaxies recede faster — the foundational evidence that the universe is expanding.",
    "First quantified by Edwin Hubble in 1929 (building on Lemaître 1927). The proportionality constant H₀ is still hotly contested today, with local and cosmological measurements disagreeing slightly — the famous 'Hubble tension'.",
    ["redshift", "cmb", "dark energy"],
  ),
  "redshift z": entry(
    "redshift z",
    "The dimensionless number describing how much a light wave has stretched on its way to us — z = 0 here and now, z = 1 means the wavelength has doubled, z = 1100 is the CMB.",
    undefined,
    ["redshift", "hubble's law"],
  ),
  exoplanet: entry(
    "exoplanet",
    "A planet orbiting a star other than the Sun. Over 5,800 are confirmed, mostly via transits and radial velocities.",
    undefined,
    ["transit method", "radial velocity", "habitable zone"],
  ),
  "transit method": entry(
    "transit method",
    "Finding a planet by watching for the tiny dip in a star's brightness as the planet passes in front of it.",
    "The workhorse of Kepler and TESS. A Jupiter-sized planet dims its star by about 1%; an Earth-sized planet by 0.01%. Multiple transits also yield the orbital period and, with follow-up, the mass.",
    ["exoplanet", "radial velocity"],
  ),
  "radial velocity": entry(
    "radial velocity",
    "The Doppler wobble of a star caused by an orbiting planet's gravity — the way the first exoplanet around a Sun-like star (51 Peg b, 1995) was discovered.",
    undefined,
    ["exoplanet", "transit method", "redshift"],
  ),
  biosignature: entry(
    "biosignature",
    "A chemical fingerprint in a planet's atmosphere or surface that would be difficult to produce without life.",
    "Oxygen in a CO2-rich atmosphere; methane out of equilibrium; certain dimethyl-sulphide-like gases. JWST is starting to make such measurements for small exoplanets, but none of the candidate detections is unambiguous yet.",
    ["habitable zone", "exoplanet"],
  ),
  "habitable zone": entry(
    "habitable zone",
    "The range of distances from a star where a rocky planet could plausibly hold liquid water on its surface.",
    undefined,
    ["exoplanet", "biosignature", "frost line"],
  ),
  "frost line": entry(
    "frost line",
    "The distance from a young star beyond which water freezes into ice — roughly where most of the giant planets in any system formed.",
    undefined,
    ["habitable zone"],
  ),
  "Roche limit": entry(
    "Roche limit",
    "The distance below which a moon or comet would be ripped apart by its primary's tidal force. Saturn's rings sit inside Saturn's Roche limit, which is why they have not coalesced into a moon.",
    undefined,
    ["tidal lock"],
  ),
  "tidal lock": entry(
    "tidal lock",
    "When an object's spin and orbital period are equal, so it always shows the same face to its primary (our Moon, for example).",
    undefined,
    ["libration", "Roche limit"],
  ),
  "asteroid belt": entry(
    "asteroid belt",
    "The doughnut of small rocky bodies between Mars and Jupiter — the building blocks of a planet Jupiter's gravity never let form.",
    undefined,
    ["kuiper belt", "oort cloud"],
  ),
  "Kuiper belt": entry(
    "Kuiper belt",
    "The ring of icy bodies beyond Neptune (roughly 30-50 AU). Pluto is the most famous member; New Horizons also visited Arrokoth.",
    undefined,
    ["oort cloud", "asteroid belt"],
  ),
  "Oort cloud": entry(
    "Oort cloud",
    "A roughly spherical halo of trillions of icy comet nuclei stretching out to about 100,000 AU — the source reservoir of long-period comets.",
    undefined,
    ["kuiper belt"],
  ),
  "comet coma": entry(
    "comet coma",
    "The fuzzy temporary atmosphere of gas and dust that surrounds a comet's nucleus when sunlight vapourises its ices.",
    undefined,
    ["comet tail"],
  ),
  magnetar: entry(
    "magnetar",
    "A neutron star with an extreme magnetic field — up to a thousand trillion times Earth's — that produces enormous gamma-ray flares.",
    undefined,
    ["neutron star", "pulsar", "gamma-ray burst"],
  ),
  pulsar: entry(
    "pulsar",
    "A spinning neutron star whose beamed radio (or X-ray) emission sweeps past Earth like a lighthouse, producing a regular pulse.",
    "Discovered by Jocelyn Bell Burnell in 1967. Pulsar timing is the most precise long-term clock in physics — a network of millisecond pulsars is now used to detect gravitational waves from supermassive-black-hole binaries across the universe.",
    ["neutron star", "magnetar", "gravitational lensing"],
  ),
  "neutron star": entry(
    "neutron star",
    "The collapsed core of a massive star that exploded as a supernova — about 1.4 solar masses crammed into a 20-km ball, denser than an atomic nucleus.",
    undefined,
    ["pulsar", "magnetar", "supernova type II"],
  ),
  "white dwarf": entry(
    "white dwarf",
    "The Earth-sized, slowly-cooling core left behind when a Sun-like star runs out of fuel — supported against gravity by electron degeneracy pressure.",
    undefined,
    ["planetary nebula", "supernova type ia"],
  ),
  "brown dwarf": entry(
    "brown dwarf",
    "A 'failed star' too small to sustain hydrogen fusion — somewhere between the heaviest planet and the lightest red dwarf, between roughly 13 and 80 Jupiter masses.",
    undefined,
    ["main sequence"],
  ),
  "main sequence": entry(
    "main sequence",
    "The long, stable phase in a star's life when it fuses hydrogen into helium in its core — most of any star's life is spent here.",
    undefined,
    ["giant", "hr diagram", "spectral type"],
  ),
  giant: entry(
    "giant",
    "A star that has exhausted core hydrogen and expanded to many times its main-sequence radius — like Arcturus or Aldebaran.",
    undefined,
    ["supergiant", "main sequence"],
  ),
  supergiant: entry(
    "supergiant",
    "An extremely luminous evolved star — stars like Betelgeuse, Rigel, Deneb. The future supernova candidates.",
    undefined,
    ["giant", "supernova type ii"],
  ),
  "supernova type Ia": entry(
    "supernova type Ia",
    "A thermonuclear explosion of a white dwarf pushed past 1.4 solar masses — a 'standard candle' whose nearly-uniform peak brightness is how we discovered dark energy.",
    undefined,
    ["white dwarf", "dark energy"],
  ),
  "supernova type II": entry(
    "supernova type II",
    "The core-collapse explosion of a massive star (≥ 8 solar masses) at the end of its life, leaving behind a neutron star or black hole.",
    undefined,
    ["supergiant", "neutron star", "gamma-ray burst"],
  ),
  "gamma-ray burst": entry(
    "gamma-ray burst",
    "The most powerful explosions in the universe — narrow beams of gamma rays from collapsing massive stars (long GRBs) or merging neutron stars (short GRBs).",
    undefined,
    ["supernova type ii", "neutron star"],
  ),
  "emission nebula": entry(
    "emission nebula",
    "A cloud of ionised gas glowing under the ultraviolet from young hot stars — the pink colour in pictures of the Orion or Lagoon nebulae.",
    undefined,
    ["reflection nebula", "hii region", "planetary nebula"],
  ),
  "reflection nebula": entry(
    "reflection nebula",
    "A cloud of dust that does not glow on its own but scatters the blue light of nearby stars, like the haze around the Pleiades.",
    undefined,
    ["emission nebula"],
  ),
  "planetary nebula": entry(
    "planetary nebula",
    "The expanding shell of gas blown off by a Sun-like star at the end of its life — nothing to do with planets, just the round shapes William Herschel saw.",
    undefined,
    ["white dwarf"],
  ),
  "open cluster": entry(
    "open cluster",
    "A loose group of dozens to thousands of young stars born together — like the Pleiades or the Hyades — that drift apart over a few hundred million years.",
    undefined,
    ["globular cluster"],
  ),
  "globular cluster": entry(
    "globular cluster",
    "A tight spherical swarm of 100,000 to a million ancient stars, found in the halos of galaxies — billions of years old, often metal-poor.",
    undefined,
    ["open cluster"],
  ),
  "spiral galaxy": entry(
    "spiral galaxy",
    "A flattened galaxy with arms of young stars and gas — like the Milky Way or M31. Roughly 60% of bright nearby galaxies.",
    undefined,
    ["elliptical galaxy", "irregular galaxy"],
  ),
  "elliptical galaxy": entry(
    "elliptical galaxy",
    "An older, mostly-spherical galaxy with little gas and few young stars — the products of past galaxy mergers.",
    undefined,
    ["spiral galaxy", "agn"],
  ),
  "irregular galaxy": entry(
    "irregular galaxy",
    "A galaxy without a clear spiral or elliptical shape — often a dwarf or recently disturbed, like the Magellanic Clouds.",
    undefined,
    ["spiral galaxy"],
  ),
  AGN: entry(
    "AGN",
    "Active Galactic Nucleus — a galaxy's centre where a supermassive black hole is actively feeding and pouring out radiation across the spectrum.",
    undefined,
    ["quasar", "blazar", "seyfert", "accretion disk"],
  ),
  quasar: entry(
    "quasar",
    "The most luminous kind of AGN — galaxies whose accreting central black hole vastly outshines the rest of the host, visible across most of the observable universe.",
    undefined,
    ["agn", "blazar", "redshift z"],
  ),
  blazar: entry(
    "blazar",
    "An AGN whose relativistic jet happens to point straight at Earth, making it look extraordinarily bright and variable.",
    undefined,
    ["agn", "quasar"],
  ),
  Seyfert: entry(
    "Seyfert",
    "A spiral galaxy with a bright but not overwhelming active nucleus — Carl Seyfert's 1943 class, named after the prototype M77.",
    undefined,
    ["agn", "quasar"],
  ),
  "dark nebula": entry(
    "dark nebula",
    "A dense cloud of dust opaque enough to block the light of stars behind it — like the Horsehead silhouetted against IC 434.",
    undefined,
    ["molecular cloud", "emission nebula"],
  ),
  "molecular cloud": entry(
    "molecular cloud",
    "A cold (10-20 K), dense region of mostly H₂ gas — the only place stars are born.",
    undefined,
    ["dark nebula", "hii region"],
  ),
  "HII region": entry(
    "HII region",
    "A cloud of hydrogen gas that has been ionised by hot young stars, glowing in the characteristic red Hα line.",
    undefined,
    ["emission nebula", "molecular cloud"],
  ),
  "HR diagram": entry(
    "HR diagram",
    "Hertzsprung-Russell diagram — a plot of luminosity vs temperature that organises every star into evolutionary tracks.",
    "Hertzsprung (1911) and Russell (1913) independently noticed that most stars lie on a 'main sequence' diagonal, with separate giant and white-dwarf branches. The HR diagram is to stellar physics what the periodic table is to chemistry.",
    ["main sequence", "spectral type", "giant"],
  ),
  "spectral type": entry(
    "spectral type",
    "The classification of a star by the absorption lines in its spectrum — sequence O B A F G K M, hot to cool, from blue O-stars to red M-dwarfs.",
    "The mnemonic 'Oh Be A Fine Guy/Girl Kiss Me' is the traditional teaching tool. Our Sun is a G2V (G-type, dwarf, sub-class 2). Each letter is also subdivided 0-9, and a luminosity class (I-V) is appended.",
    ["hr diagram", "main sequence"],
  ),
  metallicity: entry(
    "metallicity",
    "How much of a star's mass is made of elements heavier than helium. Astronomers (a little aggressively) call anything past helium a 'metal'.",
    undefined,
    ["spectral type"],
  ),
  "age (Gyr)": entry(
    "age (Gyr)",
    "Stellar age in billions of years (gigayears). The universe itself is 13.8 Gyr; the Sun 4.6 Gyr; the oldest globular clusters about 12-13 Gyr.",
    undefined,
    ["hr diagram"],
  ),
  "distance modulus": entry(
    "distance modulus",
    "The difference between a star's apparent and absolute magnitudes — a handy logarithmic way to express its distance.",
    undefined,
    ["apparent magnitude", "absolute magnitude", "parsec"],
  ),
  "Cepheid variable": entry(
    "Cepheid variable",
    "A class of pulsating yellow giants whose period of variation tells you their intrinsic luminosity — the standard candle that lets Hubble measure distances to other galaxies.",
    "Henrietta Leavitt's 1912 discovery of the period-luminosity relation in Magellanic Cloud Cepheids unlocked extragalactic distances and ultimately the expansion of the universe.",
    ["absolute magnitude", "rr lyrae", "hubble's law"],
  ),
  "RR Lyrae": entry(
    "RR Lyrae",
    "Short-period (< 1 day) pulsating variables found in globular clusters — fainter standard candles than Cepheids, used to map the Milky Way's halo.",
    undefined,
    ["cepheid variable", "globular cluster"],
  ),
  luminosity: entry(
    "luminosity",
    "The total energy a star pours out per second — measured in Watts or in 'solar luminosities' (L☉ = 3.83 × 10²⁶ W).",
    undefined,
    ["absolute magnitude", "main sequence"],
  ),
  "comet tail": entry(
    "comet tail",
    "The streams of gas and dust pushed away from a comet by sunlight and the solar wind. The blue ion tail points straight away from the Sun; the white dust tail curves along the orbit.",
    undefined,
    ["comet coma"],
  ),
  meteor: entry(
    "meteor",
    "The flash of light when a small bit of solar-system debris burns up in Earth's atmosphere — also called a 'shooting star'.",
    undefined,
    ["meteoroid", "meteorite"],
  ),
  meteoroid: entry(
    "meteoroid",
    "A small chunk of rock or metal moving through space — once it enters our atmosphere it becomes a meteor, and if any bit reaches the ground it becomes a meteorite.",
    undefined,
    ["meteor", "meteorite"],
  ),
  meteorite: entry(
    "meteorite",
    "A piece of a meteoroid that has survived the fall through the atmosphere and landed on Earth's surface.",
    undefined,
    ["meteor", "meteoroid"],
  ),
  albedo: entry(
    "albedo",
    "The fraction of incoming sunlight a body reflects. Fresh snow is about 0.9; coal is near 0.04; Earth averages 0.30.",
    undefined,
    ["luminosity"],
  ),
  "axial tilt": entry(
    "axial tilt",
    "The angle between a planet's rotation axis and the line perpendicular to its orbital plane. Earth's is 23.4°; Uranus's is 98°.",
    undefined,
    ["ecliptic", "precession"],
  ),
  precession: entry(
    "precession",
    "The slow circular wobble of a planet's rotation axis — Earth's traces out a 26,000-year cone, slowly cycling which star sits closest to the celestial pole.",
    undefined,
    ["axial tilt", "j2000"],
  ),
  "Local Group": entry(
    "Local Group",
    "The cluster of about 80 nearby galaxies — gravitationally bound — dominated by the Milky Way and Andromeda (M31).",
    undefined,
    ["spiral galaxy", "irregular galaxy"],
  ),
  "Schwarzschild radius": entry(
    "Schwarzschild radius",
    "The size of a non-rotating black hole's event horizon — about 3 km per solar mass.",
    undefined,
    ["event horizon"],
  ),
  Chandrasekhar: entry(
    "Chandrasekhar limit",
    "The maximum mass a white dwarf can have (≈ 1.4 solar masses) before electron degeneracy pressure fails and it collapses or detonates.",
    undefined,
    ["white dwarf", "supernova type ia"],
  ),
  "Hubble tension": entry(
    "Hubble tension",
    "The persistent ~9% disagreement between local (Cepheid + supernova) and cosmological (CMB) measurements of the universe's expansion rate.",
    undefined,
    ["hubble's law", "cmb", "cepheid variable"],
  ),
  "stellar wind": entry(
    "stellar wind",
    "The continuous outflow of charged particles a star sheds — the Sun's wind is what carves out the heliosphere and shapes auroras on every planet with a magnetic field.",
    undefined,
    ["corona", "cme"],
  ),
  heliosphere: entry(
    "heliosphere",
    "The bubble of solar wind around the solar system, which extends past Pluto and ends at the heliopause where the interstellar medium takes over.",
    undefined,
    ["stellar wind"],
  ),
  Doppler: entry(
    "Doppler effect",
    "The shift in observed wavelength when source and observer move relative to each other — the same effect that changes a passing ambulance's pitch.",
    undefined,
    ["redshift", "blueshift", "radial velocity"],
  ),
  occultation: entry(
    "occultation",
    "When one celestial body passes in front of another and hides it — like the Moon covering a star, or Pluto covering a background star (which is how we discovered Pluto's atmosphere).",
    undefined,
    ["transit method", "eclipse"],
  ),
  eclipse: entry(
    "eclipse",
    "When one body falls into another's shadow — a solar eclipse is the Moon blocking the Sun, a lunar eclipse is Earth's shadow falling on the Moon.",
    undefined,
    ["occultation"],
  ),
  apsis: entry(
    "apsis",
    "The point of an orbit at maximum or minimum distance from the primary. Perihelion / aphelion for orbits around the Sun, perigee / apogee for Earth.",
    undefined,
    ["perihelion", "aphelion", "eccentricity"],
  ),
  "solar wind": entry(
    "solar wind",
    "The stream of charged particles continuously flowing from the Sun at hundreds of kilometres per second — the medium that carries solar storms to Earth.",
    undefined,
    ["stellar wind", "cme", "corona"],
  ),
  "Lagrange point": entry(
    "Lagrange point",
    "One of five gravitational sweet spots in a two-body system where small objects can sit in stable co-orbit. JWST lives at Sun-Earth L2.",
    undefined,
    [],
  ),
};

function normalise(term: string): string {
  return term.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

const NORMALISED_MAP: Map<string, GlossaryTerm> = (() => {
  const m = new Map<string, GlossaryTerm>();
  for (const [key, value] of Object.entries(GLOSSARY)) {
    m.set(normalise(key), value);
  }
  // Light alias table for things the rest of the app spells slightly
  // differently.
  const aliases: Array<[string, string]> = [
    ["mag", "apparent magnitude"],
    ["magnitude", "apparent magnitude"],
    ["v mag", "apparent magnitude"],
    ["abs mag", "absolute magnitude"],
    ["ly", "light-year"],
    ["light year", "light-year"],
    ["lightyear", "light-year"],
    ["pc", "parsec"],
    ["mpc", "parsec"],
    ["au", "AU"],
    ["astronomical unit", "AU"],
    ["ra", "right ascension"],
    ["dec", "declination"],
    ["z", "redshift z"],
    ["cosmic microwave background", "CMB"],
    ["hubble law", "Hubble's law"],
    ["hubble's law", "Hubble's law"],
    ["coronal mass ejection", "CME"],
    ["agn", "AGN"],
    ["active galactic nucleus", "AGN"],
    ["seyfert galaxy", "Seyfert"],
    ["hii", "HII region"],
    ["h ii region", "HII region"],
    ["hr", "HR diagram"],
    ["hertzsprung russell diagram", "HR diagram"],
    ["spectral class", "spectral type"],
    ["gigayear", "age (Gyr)"],
    ["gyr", "age (Gyr)"],
    ["doppler shift", "Doppler"],
    ["doppler effect", "Doppler"],
    ["roche", "Roche limit"],
    ["lagrange", "Lagrange point"],
    ["l1", "Lagrange point"],
    ["l2", "Lagrange point"],
    ["schwarzschild", "Schwarzschild radius"],
    ["chandrasekhar limit", "Chandrasekhar"],
    ["cepheid", "Cepheid variable"],
    ["rr lyrae variable", "RR Lyrae"],
  ];
  for (const [alias, key] of aliases) {
    const t = GLOSSARY[key];
    if (t) m.set(normalise(alias), t);
  }
  return m;
})();

/** Tolerant lookup. Returns null when the term is not in the glossary. */
export function glossaryFor(term: string): GlossaryTerm | null {
  if (!term) return null;
  return NORMALISED_MAP.get(normalise(term)) ?? null;
}

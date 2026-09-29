"""Gazetteer offline de zonas de Argentina.

Último recurso cuando los geocoders externos (Photon, Nominatim, Georef) están
down o nos bloquearon por rate-limit. Cubre:
- 48 barrios de CABA
- 24 partidos del Gran Buenos Aires
- Capitales provinciales + ciudades >100K hab
- Zonas turísticas populares (Bariloche, Ushuaia, etc.)

Búsqueda por substring case-insensitive sobre nombre y aliases. Suficiente para
que el buscador de /ruta siempre devuelva algo para queries típicas.
"""
from __future__ import annotations


# (display_name, lat, lon, province, aliases)
PLACES: list[tuple[str, float, float, str, tuple[str, ...]]] = [
    # --- CABA barrios ---
    ("Agronomía", -34.5905, -58.4841, "Ciudad Autónoma de Buenos Aires", ()),
    ("Almagro", -34.6099, -58.4208, "Ciudad Autónoma de Buenos Aires", ()),
    ("Balvanera", -34.6095, -58.4021, "Ciudad Autónoma de Buenos Aires", ("once",)),
    ("Barracas", -34.6450, -58.3822, "Ciudad Autónoma de Buenos Aires", ()),
    ("Belgrano", -34.5615, -58.4566, "Ciudad Autónoma de Buenos Aires", ()),
    ("Boedo", -34.6294, -58.4141, "Ciudad Autónoma de Buenos Aires", ()),
    ("Caballito", -34.6192, -58.4400, "Ciudad Autónoma de Buenos Aires", ()),
    ("Chacarita", -34.5865, -58.4550, "Ciudad Autónoma de Buenos Aires", ()),
    ("Coghlan", -34.5641, -58.4733, "Ciudad Autónoma de Buenos Aires", ()),
    ("Colegiales", -34.5744, -58.4499, "Ciudad Autónoma de Buenos Aires", ()),
    ("Constitución", -34.6271, -58.3811, "Ciudad Autónoma de Buenos Aires", ()),
    ("Flores", -34.6295, -58.4643, "Ciudad Autónoma de Buenos Aires", ()),
    ("Floresta", -34.6302, -58.4832, "Ciudad Autónoma de Buenos Aires", ()),
    ("La Boca", -34.6337, -58.3635, "Ciudad Autónoma de Buenos Aires", ("boca",)),
    ("La Paternal", -34.5960, -58.4702, "Ciudad Autónoma de Buenos Aires", ("paternal",)),
    ("Liniers", -34.6396, -58.5215, "Ciudad Autónoma de Buenos Aires", ()),
    ("Mataderos", -34.6572, -58.5067, "Ciudad Autónoma de Buenos Aires", ()),
    ("Monserrat", -34.6121, -58.3800, "Ciudad Autónoma de Buenos Aires", ("montserrat",)),
    ("Monte Castro", -34.6133, -58.4993, "Ciudad Autónoma de Buenos Aires", ()),
    ("Nueva Pompeya", -34.6485, -58.4173, "Ciudad Autónoma de Buenos Aires", ("pompeya",)),
    ("Núñez", -34.5447, -58.4604, "Ciudad Autónoma de Buenos Aires", ("nunez",)),
    ("Palermo", -34.5789, -58.4280, "Ciudad Autónoma de Buenos Aires", ()),
    ("Parque Avellaneda", -34.6476, -58.4795, "Ciudad Autónoma de Buenos Aires", ()),
    ("Parque Chacabuco", -34.6358, -58.4380, "Ciudad Autónoma de Buenos Aires", ()),
    ("Parque Chas", -34.5827, -58.4781, "Ciudad Autónoma de Buenos Aires", ()),
    ("Parque Patricios", -34.6377, -58.4018, "Ciudad Autónoma de Buenos Aires", ()),
    ("Puerto Madero", -34.6101, -58.3657, "Ciudad Autónoma de Buenos Aires", ()),
    ("Recoleta", -34.5889, -58.3952, "Ciudad Autónoma de Buenos Aires", ()),
    ("Retiro", -34.5918, -58.3739, "Ciudad Autónoma de Buenos Aires", ()),
    ("Saavedra", -34.5540, -58.4859, "Ciudad Autónoma de Buenos Aires", ()),
    ("San Cristóbal", -34.6254, -58.4005, "Ciudad Autónoma de Buenos Aires", ("san cristobal",)),
    ("San Nicolás", -34.6055, -58.3806, "Ciudad Autónoma de Buenos Aires", ("san nicolas", "microcentro")),
    ("San Telmo", -34.6215, -58.3731, "Ciudad Autónoma de Buenos Aires", ()),
    ("Vélez Sarsfield", -34.6358, -58.4932, "Ciudad Autónoma de Buenos Aires", ("velez sarsfield",)),
    ("Versalles", -34.6309, -58.5205, "Ciudad Autónoma de Buenos Aires", ()),
    ("Villa Crespo", -34.5988, -58.4402, "Ciudad Autónoma de Buenos Aires", ()),
    ("Villa del Parque", -34.6005, -58.4872, "Ciudad Autónoma de Buenos Aires", ()),
    ("Villa Devoto", -34.6007, -58.5129, "Ciudad Autónoma de Buenos Aires", ("devoto",)),
    ("Villa General Mitre", -34.6091, -58.4728, "Ciudad Autónoma de Buenos Aires", ()),
    ("Villa Lugano", -34.6745, -58.4771, "Ciudad Autónoma de Buenos Aires", ("lugano",)),
    ("Villa Luro", -34.6376, -58.5004, "Ciudad Autónoma de Buenos Aires", ()),
    ("Villa Ortúzar", -34.5796, -58.4699, "Ciudad Autónoma de Buenos Aires", ("villa ortuzar",)),
    ("Villa Pueyrredón", -34.5724, -58.5015, "Ciudad Autónoma de Buenos Aires", ("villa pueyrredon",)),
    ("Villa Real", -34.6152, -58.5259, "Ciudad Autónoma de Buenos Aires", ()),
    ("Villa Riachuelo", -34.6893, -58.4647, "Ciudad Autónoma de Buenos Aires", ()),
    ("Villa Santa Rita", -34.6109, -58.4822, "Ciudad Autónoma de Buenos Aires", ()),
    ("Villa Soldati", -34.6666, -58.4348, "Ciudad Autónoma de Buenos Aires", ("soldati",)),
    ("Villa Urquiza", -34.5761, -58.4867, "Ciudad Autónoma de Buenos Aires", ()),

    # --- Gran Buenos Aires (partidos) ---
    ("Almirante Brown", -34.8007, -58.3931, "Buenos Aires", ("adrogue", "burzaco")),
    ("Avellaneda", -34.6636, -58.3657, "Buenos Aires", ()),
    ("Berazategui", -34.7633, -58.2087, "Buenos Aires", ()),
    ("Esteban Echeverría", -34.8100, -58.4725, "Buenos Aires", ("esteban echeverria", "monte grande")),
    ("Ezeiza", -34.8533, -58.5233, "Buenos Aires", ()),
    ("Florencio Varela", -34.8067, -58.2747, "Buenos Aires", ()),
    ("General San Martín", -34.5765, -58.5392, "Buenos Aires", ("general san martin", "san martin")),
    ("Hurlingham", -34.5931, -58.6340, "Buenos Aires", ()),
    ("Ituzaingó", -34.6583, -58.6700, "Buenos Aires", ("ituzaingo",)),
    ("José C. Paz", -34.5200, -58.7600, "Buenos Aires", ("jose c paz", "jose c. paz")),
    ("La Matanza", -34.7694, -58.6300, "Buenos Aires", ("ramos mejia", "san justo", "gonzalez catan")),
    ("Lanús", -34.7066, -58.3930, "Buenos Aires", ("lanus",)),
    ("Lomas de Zamora", -34.7603, -58.3989, "Buenos Aires", ("lomas",)),
    ("Malvinas Argentinas", -34.5000, -58.7033, "Buenos Aires", ("grand bourg", "los polvorines")),
    ("Merlo", -34.6653, -58.7286, "Buenos Aires", ()),
    ("Moreno", -34.6505, -58.7902, "Buenos Aires", ()),
    ("Morón", -34.6534, -58.6198, "Buenos Aires", ("moron",)),
    ("Pilar", -34.4586, -58.9143, "Buenos Aires", ()),
    ("Quilmes", -34.7203, -58.2540, "Buenos Aires", ()),
    ("San Fernando", -34.4425, -58.5594, "Buenos Aires", ()),
    ("San Isidro", -34.4706, -58.5280, "Buenos Aires", ("martinez",)),
    ("San Miguel", -34.5430, -58.7127, "Buenos Aires", ()),
    ("Tigre", -34.4261, -58.5796, "Buenos Aires", ()),
    ("Tres de Febrero", -34.6005, -58.5643, "Buenos Aires", ("caseros", "ciudadela")),
    ("Vicente López", -34.5258, -58.4766, "Buenos Aires", ("vicente lopez", "olivos", "florida")),

    # --- Interior de Buenos Aires ---
    ("La Plata", -34.9215, -57.9545, "Buenos Aires", ()),
    ("Mar del Plata", -38.0055, -57.5426, "Buenos Aires", ("mdp",)),
    ("Bahía Blanca", -38.7183, -62.2663, "Buenos Aires", ("bahia blanca",)),
    ("Tandil", -37.3217, -59.1332, "Buenos Aires", ()),
    ("Olavarría", -36.8924, -60.3224, "Buenos Aires", ("olavarria",)),
    ("Pergamino", -33.8890, -60.5710, "Buenos Aires", ()),
    ("Junín", -34.5895, -60.9500, "Buenos Aires", ("junin",)),
    ("Zárate", -34.0949, -59.0293, "Buenos Aires", ("zarate",)),
    ("Campana", -34.1667, -58.9600, "Buenos Aires", ()),
    ("Cañuelas", -35.0553, -58.7577, "Buenos Aires", ("canuelas",)),
    ("San Pedro", -33.6810, -59.6657, "Buenos Aires", ()),
    ("Chivilcoy", -34.8990, -60.0200, "Buenos Aires", ()),
    ("Azul", -36.7770, -59.8580, "Buenos Aires", ()),
    ("Dolores", -36.3158, -57.6791, "Buenos Aires", ()),
    ("Necochea", -38.5545, -58.7396, "Buenos Aires", ()),
    ("Villa Gesell", -37.2540, -56.9670, "Buenos Aires", ("gesell",)),
    ("Pinamar", -37.1060, -56.8605, "Buenos Aires", ()),
    ("San Nicolás de los Arroyos", -33.3370, -60.2098, "Buenos Aires", ("san nicolas de los arroyos",)),
    ("Luján", -34.5667, -59.1167, "Buenos Aires", ("lujan",)),
    ("Escobar", -34.3486, -58.7935, "Buenos Aires", ("belen de escobar",)),
    ("Lobos", -35.1849, -59.0984, "Buenos Aires", ()),
    ("Chascomús", -35.5700, -58.0100, "Buenos Aires", ("chascomus",)),

    # --- Córdoba ---
    ("Córdoba Capital", -31.4201, -64.1888, "Córdoba", ("cordoba",)),
    ("Villa Carlos Paz", -31.4160, -64.5000, "Córdoba", ("carlos paz",)),
    ("Río Cuarto", -33.1300, -64.3475, "Córdoba", ("rio cuarto",)),
    ("Villa María", -32.4080, -63.2400, "Córdoba", ("villa maria",)),
    ("San Francisco", -31.4275, -62.0851, "Córdoba", ()),
    ("Alta Gracia", -31.6532, -64.4330, "Córdoba", ()),
    ("La Falda", -31.0920, -64.5150, "Córdoba", ()),
    ("Villa General Belgrano", -31.9706, -64.5544, "Córdoba", ()),
    ("Mina Clavero", -31.7270, -65.0104, "Córdoba", ()),
    ("Jesús María", -30.9788, -64.0961, "Córdoba", ("jesus maria",)),
    ("Bell Ville", -32.6316, -62.6905, "Córdoba", ()),

    # --- Santa Fe ---
    ("Rosario", -32.9442, -60.6505, "Santa Fe", ()),
    ("Santa Fe Capital", -31.6333, -60.7000, "Santa Fe", ("santa fe",)),
    ("Rafaela", -31.2504, -61.4867, "Santa Fe", ()),
    ("Venado Tuerto", -33.7450, -61.9693, "Santa Fe", ()),
    ("Reconquista", -29.1489, -59.6461, "Santa Fe", ()),
    ("Santo Tomé", -31.6670, -60.7670, "Santa Fe", ("santo tome",)),
    ("Esperanza", -31.4500, -60.9333, "Santa Fe", ()),

    # --- Mendoza ---
    ("Mendoza Capital", -32.8895, -68.8458, "Mendoza", ("mendoza",)),
    ("Godoy Cruz", -32.9247, -68.8393, "Mendoza", ()),
    ("Guaymallén", -32.8913, -68.7919, "Mendoza", ("guaymallen",)),
    ("San Rafael", -34.6177, -68.3301, "Mendoza", ()),
    ("Maipú", -32.9870, -68.7910, "Mendoza", ("maipu",)),
    ("Las Heras", -32.8500, -68.8167, "Mendoza", ()),
    ("Luján de Cuyo", -33.0361, -68.8764, "Mendoza", ("lujan de cuyo",)),
    ("Malargüe", -35.4750, -69.5853, "Mendoza", ("malargue",)),
    ("Tunuyán", -33.5781, -69.0173, "Mendoza", ("tunuyan",)),

    # --- Tucumán ---
    ("San Miguel de Tucumán", -26.8083, -65.2176, "Tucumán", ("tucuman", "san miguel de tucuman")),
    ("Yerba Buena", -26.8134, -65.3062, "Tucumán", ()),
    ("Tafí del Valle", -26.8531, -65.7103, "Tucumán", ("tafi del valle",)),
    ("Concepción", -27.3391, -65.5937, "Tucumán", ("concepcion",)),

    # --- Salta ---
    ("Salta Capital", -24.7821, -65.4232, "Salta", ("salta",)),
    ("Cafayate", -26.0737, -65.9782, "Salta", ()),
    ("San Ramón de la Nueva Orán", -23.1410, -64.3310, "Salta", ("oran",)),
    ("Tartagal", -22.5178, -63.8096, "Salta", ()),

    # --- Jujuy ---
    ("San Salvador de Jujuy", -24.1858, -65.2995, "Jujuy", ("jujuy",)),
    ("Palpalá", -24.2550, -65.2103, "Jujuy", ("palpala",)),
    ("Libertador General San Martín", -23.8092, -64.7880, "Jujuy", ("ledesma",)),
    ("Humahuaca", -23.2030, -65.3500, "Jujuy", ()),
    ("Purmamarca", -23.7444, -65.5003, "Jujuy", ()),
    ("Tilcara", -23.5772, -65.3956, "Jujuy", ()),

    # --- Entre Ríos ---
    ("Paraná", -31.7319, -60.5238, "Entre Ríos", ("parana",)),
    ("Concordia", -31.3933, -58.0209, "Entre Ríos", ()),
    ("Gualeguaychú", -33.0093, -58.5169, "Entre Ríos", ("gualeguaychu",)),
    ("Gualeguay", -33.1400, -59.3200, "Entre Ríos", ()),
    ("Concepción del Uruguay", -32.4839, -58.2330, "Entre Ríos", ("concepcion del uruguay",)),
    ("Colón", -32.2236, -58.1432, "Entre Ríos", ("colon",)),

    # --- Corrientes ---
    ("Corrientes Capital", -27.4691, -58.8306, "Corrientes", ("corrientes",)),
    ("Goya", -29.1400, -59.2600, "Corrientes", ()),
    ("Mercedes", -29.1833, -58.0667, "Corrientes", ()),
    ("Paso de los Libres", -29.7139, -57.0889, "Corrientes", ()),

    # --- Misiones ---
    ("Posadas", -27.3672, -55.8961, "Misiones", ()),
    ("Puerto Iguazú", -25.5953, -54.5762, "Misiones", ("iguazu", "puerto iguazu")),
    ("Oberá", -27.4858, -55.1200, "Misiones", ("obera",)),
    ("Eldorado", -26.4085, -54.6279, "Misiones", ()),

    # --- Chaco ---
    ("Resistencia", -27.4514, -58.9867, "Chaco", ()),
    ("Presidencia Roque Sáenz Peña", -26.7854, -60.4387, "Chaco", ("saenz pena",)),
    ("Villa Ángela", -27.5720, -60.7180, "Chaco", ("villa angela",)),

    # --- Formosa ---
    ("Formosa Capital", -26.1775, -58.1781, "Formosa", ("formosa",)),
    ("Clorinda", -25.2850, -57.7170, "Formosa", ()),

    # --- Santiago del Estero ---
    ("Santiago del Estero", -27.7951, -64.2615, "Santiago del Estero", ()),
    ("La Banda", -27.7400, -64.2500, "Santiago del Estero", ()),
    ("Termas de Río Hondo", -27.4917, -64.8578, "Santiago del Estero", ("termas de rio hondo",)),

    # --- La Rioja ---
    ("La Rioja Capital", -29.4131, -66.8558, "La Rioja", ("la rioja",)),
    ("Chilecito", -29.1647, -67.4950, "La Rioja", ()),

    # --- Catamarca ---
    ("San Fernando del Valle de Catamarca", -28.4696, -65.7795, "Catamarca", ("catamarca",)),
    ("Belén", -27.6530, -67.0310, "Catamarca", ("belen",)),

    # --- San Juan ---
    ("San Juan Capital", -31.5375, -68.5364, "San Juan", ("san juan",)),
    ("Rawson", -31.5939, -68.5361, "San Juan", ()),
    ("Rivadavia", -31.5341, -68.5783, "San Juan", ()),
    ("Chimbas", -31.4981, -68.5483, "San Juan", ()),

    # --- San Luis ---
    ("San Luis Capital", -33.3017, -66.3378, "San Luis", ("san luis",)),
    ("Villa Mercedes", -33.6750, -65.4570, "San Luis", ()),
    ("Merlo (San Luis)", -32.3472, -65.0228, "San Luis", ()),

    # --- La Pampa ---
    ("Santa Rosa", -36.6167, -64.2833, "La Pampa", ()),
    ("General Pico", -35.6560, -63.7570, "La Pampa", ()),

    # --- Neuquén ---
    ("Neuquén Capital", -38.9516, -68.0591, "Neuquén", ("neuquen",)),
    ("San Martín de los Andes", -40.1578, -71.3530, "Neuquén", ("san martin de los andes",)),
    ("Villa La Angostura", -40.7579, -71.6488, "Neuquén", ()),
    ("Cutral Có", -38.9339, -69.2300, "Neuquén", ("cutral co",)),
    ("Plaza Huincul", -38.9250, -69.2333, "Neuquén", ()),
    ("Zapala", -38.8989, -70.0672, "Neuquén", ()),
    ("Villa Pehuenia", -38.8978, -71.1733, "Neuquén", ()),

    # --- Río Negro ---
    ("San Carlos de Bariloche", -41.1335, -71.3103, "Río Negro", ("bariloche",)),
    ("General Roca", -39.0333, -67.5833, "Río Negro", ()),
    ("Cipolletti", -38.9344, -67.9933, "Río Negro", ()),
    ("Viedma", -40.8135, -62.9967, "Río Negro", ()),
    ("El Bolsón", -41.9700, -71.5333, "Río Negro", ("el bolson",)),
    ("Las Grutas", -40.8028, -65.0847, "Río Negro", ()),

    # --- Chubut ---
    ("Rawson (Chubut)", -43.3002, -65.1023, "Chubut", ()),
    ("Comodoro Rivadavia", -45.8643, -67.4963, "Chubut", ("comodoro",)),
    ("Trelew", -43.2489, -65.3050, "Chubut", ()),
    ("Puerto Madryn", -42.7690, -65.0394, "Chubut", ("madryn",)),
    ("Esquel", -42.9126, -71.3167, "Chubut", ()),

    # --- Santa Cruz ---
    ("Río Gallegos", -51.6230, -69.2168, "Santa Cruz", ("rio gallegos",)),
    ("El Calafate", -50.3374, -72.2648, "Santa Cruz", ("calafate",)),
    ("El Chaltén", -49.3315, -72.8867, "Santa Cruz", ("chalten",)),
    ("Caleta Olivia", -46.4389, -67.5258, "Santa Cruz", ()),

    # --- Tierra del Fuego ---
    ("Ushuaia", -54.8019, -68.3030, "Tierra del Fuego", ()),
    ("Río Grande", -53.7867, -67.7106, "Tierra del Fuego", ("rio grande",)),
    ("Tolhuin", -54.5069, -67.1983, "Tierra del Fuego", ()),
]


def _normalize(s: str) -> str:
    s = s.lower().strip()
    for a, b in (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"), ("ñ", "n")):
        s = s.replace(a, b)
    return s


# Índice precomputado (una vez al importar): lista de tuplas (nombre_norm, place_tuple)
_INDEX: list[tuple[str, tuple]] = []
for p in PLACES:
    name, lat, lon, prov, aliases = p
    _INDEX.append((_normalize(name), p))
    for al in aliases:
        _INDEX.append((_normalize(al), p))


def search(query: str, max_results: int = 8) -> list[dict]:
    """Búsqueda por substring (case/acento-insensitive). Prioriza prefix matches."""
    q = _normalize(query)
    if len(q) < 2:
        return []
    prefix_hits: list[tuple] = []
    contains_hits: list[tuple] = []
    seen: set[tuple[str, float, float]] = set()
    for norm_name, place in _INDEX:
        if norm_name.startswith(q):
            key = (place[0], place[1], place[2])
            if key not in seen:
                seen.add(key)
                prefix_hits.append(place)
        elif q in norm_name:
            key = (place[0], place[1], place[2])
            if key not in seen:
                seen.add(key)
                contains_hits.append(place)
    ranked = prefix_hits + contains_hits
    out: list[dict] = []
    for name, lat, lon, prov, _ in ranked[:max_results]:
        out.append(
            {
                "label": f"{name}, {prov}" if prov and prov not in name else name,
                "lat": lat,
                "lon": lon,
                "province": prov,
                "department": None,
                "locality": name,
            }
        )
    return out
